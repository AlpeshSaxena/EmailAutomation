import { useState } from "react";
import { Link } from "wouter";
import { useListTemplates, useDeleteTemplate } from "@workspace/api-client-react";
import { getListTemplatesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Trash2, Edit, FileText, Tag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

export default function TemplateList() {
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const { data: templates, isLoading } = useListTemplates();
  const deleteTemplate = useDeleteTemplate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteTemplate.mutateAsync({ id: deleteId });
      await queryClient.invalidateQueries({ queryKey: getListTemplatesQueryKey() });
      setDeleteId(null);
      toast({ title: "Template deleted" });
    } catch {
      toast({ title: "Failed to delete template", variant: "destructive" });
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Templates</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your email templates</p>
        </div>
        <Link href="/templates/new">
          <Button>
            <Plus className="w-4 h-4 mr-1.5" />
            New Template
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 w-full" />)}
        </div>
      ) : templates && templates.length > 0 ? (
        <div className="space-y-3">
          {templates.map(template => (
            <Card key={template.id} className="hover:border-primary/40 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                      <h3 className="text-sm font-semibold text-foreground">{template.name}</h3>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                      Subject: <span className="text-foreground">{template.subject}</span>
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {template.tags && template.tags.length > 0 ? (
                        template.tags.map(tag => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full"
                          >
                            <Tag className="w-2.5 h-2.5" />
                            {tag}
                          </span>
                        ))
                      ) : null}
                      <span className="text-xs text-muted-foreground">
                        Updated {formatDistanceToNow(new Date(template.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setDeleteId(template.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    <Link href={`/templates/${template.id}/edit`}>
                      <Button variant="outline" size="sm">
                        <Edit className="w-3.5 h-3.5 mr-1.5" />
                        Edit
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-muted-foreground">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No templates yet. Create your first one!</p>
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this template.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
