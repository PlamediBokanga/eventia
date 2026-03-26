"use client";

import { useEffect, useRef } from "react";

type Props = {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
};

function IconButton({
  label,
  onClick
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="btn-ghost px-2 py-1 text-[10px]"
      onClick={onClick}
    >
      {label}
    </button>
  );
}

export function RichTextEditor({ value, onChange, placeholder }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    if (ref.current.innerHTML !== value) {
      ref.current.innerHTML = value || "";
    }
  }, [value]);

  function exec(command: string, arg?: string) {
    ref.current?.focus();
    document.execCommand(command, false, arg);
    onChange(ref.current?.innerHTML ?? "");
  }

  function addLink() {
    const url = window.prompt("URL du lien (https://...)");
    if (!url) return;
    exec("createLink", url);
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        <IconButton label="Gras" onClick={() => exec("bold")} />
        <IconButton label="Italique" onClick={() => exec("italic")} />
        <IconButton label="Souligne" onClick={() => exec("underline")} />
        <IconButton label="Titre" onClick={() => exec("formatBlock", "<h2>")} />
        <IconButton label="Paragraphe" onClick={() => exec("formatBlock", "<p>")} />
        <IconButton label="Liste" onClick={() => exec("insertUnorderedList")} />
        <IconButton label="Numero" onClick={() => exec("insertOrderedList")} />
        <IconButton label="Lien" onClick={addLink} />
        <IconButton label="Gauche" onClick={() => exec("justifyLeft")} />
        <IconButton label="Centre" onClick={() => exec("justifyCenter")} />
        <IconButton label="Droite" onClick={() => exec("justifyRight")} />
        <IconButton label="Annuler" onClick={() => exec("undo")} />
        <IconButton label="Retablir" onClick={() => exec("redo")} />
      </div>

      <div
        ref={ref}
        contentEditable
        onInput={() => onChange(ref.current?.innerHTML ?? "")}
        className="min-h-[140px] w-full rounded-xl border border-primary/20 bg-background/80 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-accent/60"
        data-placeholder={placeholder || "Redigez votre invitation..."}
        suppressContentEditableWarning
      />
    </div>
  );
}

