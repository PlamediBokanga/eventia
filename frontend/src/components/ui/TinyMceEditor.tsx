"use client";

import { Editor } from "@tinymce/tinymce-react";
import { API_URL } from "@/lib/config";
import { getAuthHeaders } from "@/lib/auth";

export function TinyMceEditor({
  value,
  onChange
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const apiKey = process.env.NEXT_PUBLIC_TINYMCE_API_KEY;

  async function uploadImage(blobInfo: { filename: () => string; base64: () => string }) {
    const dataUrl = `data:image/png;base64,${blobInfo.base64()}`;
    const res = await fetch(`${API_URL}/events/upload-cover`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders()
      },
      body: JSON.stringify({
        fileName: blobInfo.filename(),
        dataUrl
      })
    });
    if (!res.ok) {
      const payload = (await res.json().catch(() => null)) as { message?: string } | null;
      throw new Error(payload?.message ?? "Upload image impossible.");
    }
    const payload = (await res.json()) as { url: string };
    return payload.url;
  }

  return (
    <div className="space-y-2">
      {!apiKey ? (
        <p className="text-[11px] text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          Cle TinyMCE manquante. Ajoutez `NEXT_PUBLIC_TINYMCE_API_KEY` dans `frontend/.env.local`.
        </p>
      ) : null}
      <Editor
        apiKey={apiKey || "no-api-key"}
        value={value}
        onEditorChange={onChange}
        init={{
          menubar: "file edit view insert format tools table help",
          height: 280,
          branding: false,
          plugins: [
            "advlist",
            "autolink",
            "lists",
            "link",
            "image",
            "charmap",
            "preview",
            "anchor",
            "searchreplace",
            "visualblocks",
            "code",
            "fullscreen",
            "insertdatetime",
            "table",
            "wordcount"
          ],
          toolbar:
            "undo redo | blocks fontfamily fontsize | bold italic underline | forecolor backcolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link table | removeformat code fullscreen",
          automatic_uploads: true,
          images_upload_handler: async blobInfo => uploadImage(blobInfo),
          content_style:
            "body { font-family: Inter, system-ui, sans-serif; font-size: 14px; line-height: 1.5; }"
        }}
      />
    </div>
  );
}
