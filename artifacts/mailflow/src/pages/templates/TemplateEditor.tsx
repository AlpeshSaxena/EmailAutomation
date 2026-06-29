import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import {
  useGetTemplate,
  useCreateTemplate,
  useUpdateTemplate,
  getGetTemplateQueryKey,
} from "@workspace/api-client-react";
import { getListTemplatesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Save, Eye, Code, Tag, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface RouteParams {
  id?: string;
}

export default function TemplateEditor() {
  const params = useParams<RouteParams>();
  const isEdit = !!params.id;
  const id = params.id ? parseInt(params.id, 10) : undefined;

  const [, setLocation] = useLocation();
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  const { data: template, isLoading } = useGetTemplate(id ?? 0, {
    query: { enabled: isEdit && !!id, queryKey: getGetTemplateQueryKey(id ?? 0) },
  });
  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    if (template) {
      setName(template.name);
      setSubject(template.subject);
      setBody(template.body);
      setTags(template.tags ?? []);
    }
  }, [template]);

  const handleSave = async () => {
    if (!name.trim() || !subject.trim() || !body.trim()) {
      toast({ title: "Name, subject, and body are required", variant: "destructive" });
      return;
    }
    try {
      if (isEdit && id) {
        await updateTemplate.mutateAsync({
          id,
          data: { name, subject, body, tags: tags.length > 0 ? tags : null },
        });
        toast({ title: "Template saved" });
      } else {
        await createTemplate.mutateAsync({
          data: { name, subject, body, tags: tags.length > 0 ? tags : null },
        });
        toast({ title: "Template created" });
      }
      await queryClient.invalidateQueries({ queryKey: getListTemplatesQueryKey() });
      setLocation("/templates");
    } catch {
      toast({ title: "Failed to save template", variant: "destructive" });
    }
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) {
      setTags([...tags, t]);
      setTagInput("");
    }
  };

  const removeTag = (t: string) => setTags(tags.filter(x => x !== t));

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const isPending = createTemplate.isPending || updateTemplate.isPending;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setLocation("/templates")}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">
            {isEdit ? "Edit Template" : "New Template"}
          </h1>
        </div>
        <Button onClick={handleSave} disabled={isPending}>
          <Save className="w-4 h-4 mr-1.5" />
          {isPending ? "Saving..." : "Save Template"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Template Name</Label>
            <Input
              placeholder="e.g. Welcome Email"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Subject Line</Label>
            <Input
              placeholder="e.g. Hello {{name}}, welcome to..."
              value={subject}
              onChange={e => setSubject(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Use {"{{name}}"}, {"{{email}}"}, {"{{role}}"}, {"{{organization}}"} for personalization.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>Tags</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Add tag..."
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addTag())}
              />
              <Button variant="outline" onClick={addTag} size="sm">
                <Tag className="w-4 h-4" />
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {tags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full"
                  >
                    {tag}
                    <button onClick={() => removeTag(tag)} className="hover:text-primary/60">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Email Body</Label>
            <Textarea
              placeholder="<h1>Hello {{name}}</h1><p>Your message here...</p>"
              value={body}
              onChange={e => setBody(e.target.value)}
              className="min-h-[280px] font-mono text-sm"
            />
          </div>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Preview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="preview">
              <TabsList className="mb-3">
                <TabsTrigger value="preview" className="text-xs">
                  <Eye className="w-3.5 h-3.5 mr-1.5" />
                  Preview
                </TabsTrigger>
                <TabsTrigger value="html" className="text-xs">
                  <Code className="w-3.5 h-3.5 mr-1.5" />
                  HTML
                </TabsTrigger>
              </TabsList>
              <TabsContent value="preview">
                {subject && (
                  <div className="mb-3 pb-3 border-b border-border">
                    <p className="text-xs text-muted-foreground">Subject:</p>
                    <p className="text-sm font-medium">
                      {subject.replace(/\{\{(\w+)\}\}/g, (_, k) => `[${k}]`)}
                    </p>
                  </div>
                )}
                <div
                  className="prose prose-sm max-w-none text-sm"
                  dangerouslySetInnerHTML={{
                    __html: body.replace(/\{\{(\w+)\}\}/g, (_, k) => `<em>[${k}]</em>`) || "<p class='text-muted-foreground'>Start typing your email body...</p>",
                  }}
                />
              </TabsContent>
              <TabsContent value="html">
                <pre className="text-xs bg-muted p-3 rounded-md overflow-auto max-h-80 whitespace-pre-wrap">
                  {body || "No HTML content yet"}
                </pre>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
