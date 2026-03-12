import { useState, useEffect, useCallback } from "react";
import { Link } from "wouter";
import {
  ArrowLeft, Trash2, Plus, Save, RotateCcw,
  ChevronDown, ChevronRight, Database, GripVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

type CribbCode = { index: number; label: string; code: string; children?: CribbCode[] };
type Product   = { id: string; code: string; name: string; cribbCodes: CribbCode[] };
type Option    = { id: string; code: string; name: string; products: Product[] };
type Section   = { id: string; code: string; name: string; options: Option[] };

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function uid(prefix = "x"): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

/** Recursive cribb-code tree editor. Any node can have children, making the cascade arbitrarily deep. */
function CribbTree({
  nodes, onChange, depth = 0,
}: {
  nodes: CribbCode[];
  onChange: (updated: CribbCode[]) => void;
  depth?: number;
}) {
  const updateNode = (idx: number, fn: (n: CribbCode) => CribbCode) =>
    onChange(nodes.map((n, i) => i === idx ? fn(n) : n));

  const deleteNode = (idx: number) =>
    onChange(nodes.filter((_, i) => i !== idx).map((n, i) => ({ ...n, index: i + 1 })));

  const addSibling = () =>
    onChange([...nodes, {
      index: nodes.length + 1,
      label: depth === 0 ? "New Variant" : "New Option",
      code: `NEW-${Date.now().toString(36).slice(-4).toUpperCase()}`,
    }]);

  const addChild = (idx: number) => {
    const parent = nodes[idx];
    const children = parent.children ?? [];
    updateNode(idx, n => ({
      ...n,
      children: [...children, {
        index: children.length + 1,
        label: "New Option",
        code: `${parent.code}.${children.length + 1}`,
      }],
    }));
  };

  return (
    <div className={depth > 0 ? "ml-3 pl-3 border-l border-border/60 mt-0.5" : ""}>
      <div className="space-y-0.5">
        {nodes.map((cc, idx) => (
          <div key={cc.code + idx}>
            <div className="flex items-center gap-2 py-0.5">
              <GripVertical className="w-3 h-3 text-muted-foreground/40 shrink-0" />
              <span
                className="text-[9px] font-mono text-muted-foreground shrink-0 truncate"
                style={{ width: `${Math.max(80, 128 - depth * 16)}px` }}
                title={cc.code}
              >
                {cc.code}
              </span>
              <Input
                value={cc.label}
                onChange={e => updateNode(idx, n => ({ ...n, label: e.target.value }))}
                className="h-6 text-xs flex-1 min-w-0"
                placeholder={depth === 0 ? "Variant / colour name…" : "Option name…"}
              />
              {cc.children && cc.children.length > 0 && (
                <span className="text-[9px] text-primary/70 shrink-0 whitespace-nowrap">
                  {cc.children.length} sub
                </span>
              )}
              <button
                onClick={() => addChild(idx)}
                title="Add child option (deeper cascade level)"
                className="p-1 text-green-500 hover:text-green-700 rounded transition-colors shrink-0"
              >
                <Plus className="w-3 h-3" />
              </button>
              <button
                onClick={() => deleteNode(idx)}
                title="Delete"
                className="p-1 text-red-400 hover:text-red-600 rounded transition-colors shrink-0"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>

            {cc.children && cc.children.length > 0 && (
              <CribbTree
                nodes={cc.children}
                onChange={updated => updateNode(idx, n => ({ ...n, children: updated }))}
                depth={depth + 1}
              />
            )}
          </div>
        ))}
      </div>

      <button
        onClick={addSibling}
        className="flex items-center gap-1 text-[9px] text-primary mt-1.5 px-1 py-0.5 hover:text-primary/80 transition-colors"
      >
        <Plus className="w-3 h-3" />
        Add {depth === 0 ? "variant" : "sub-option"}
      </button>
    </div>
  );
}

function ProductCard({
  product, onChange, onDelete,
}: {
  product: Product;
  onChange: (p: Partial<Product>) => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border rounded-lg bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2">
        <GripVertical className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
        <span className="text-[9px] font-mono text-muted-foreground w-28 shrink-0 truncate" title={product.code}>{product.code}</span>
        <Input
          value={product.name}
          onChange={e => onChange({ name: e.target.value })}
          className="h-7 text-xs flex-1 min-w-0"
          placeholder="Product name…"
        />
        <button
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors px-1 shrink-0"
          title={open ? "Hide variants" : "Edit variants"}
        >
          {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          <span>{product.cribbCodes.length} variant{product.cribbCodes.length !== 1 ? "s" : ""}</span>
        </button>
        <button
          onClick={onDelete}
          className="p-1 text-red-400 hover:text-red-600 rounded transition-colors shrink-0"
          title="Delete product"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {open && (
        <div className="px-3 pb-3 border-t border-border bg-muted/10">
          <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground mt-2 mb-1.5">
            Variants / Options
          </p>
          <CribbTree
            nodes={product.cribbCodes}
            onChange={updated => onChange({ cribbCodes: updated })}
          />
        </div>
      )}
    </div>
  );
}

function OptionBlock({
  option, sIdx, oIdx,
  onNameChange, onDelete,
  onProductChange, onProductDelete, onProductAdd,
}: {
  option: Option; sIdx: number; oIdx: number;
  onNameChange: (name: string) => void;
  onDelete: () => void;
  onProductChange: (pIdx: number, p: Partial<Product>) => void;
  onProductDelete: (pIdx: number) => void;
  onProductAdd: () => void;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border border-border rounded-lg bg-background overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/20 border-b border-border">
        <button onClick={() => setOpen(o => !o)} className="text-muted-foreground hover:text-foreground transition-colors">
          {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>
        <GripVertical className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
        <span className="text-[9px] font-mono text-muted-foreground w-12 shrink-0">{option.code}</span>
        <Input
          value={option.name}
          onChange={e => onNameChange(e.target.value)}
          className="h-6 text-xs font-medium flex-1 min-w-0"
          placeholder="Option name…"
        />
        <button
          onClick={onDelete}
          className="p-1 text-red-400 hover:text-red-600 rounded transition-colors shrink-0 ml-1"
          title="Delete option"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {open && (
        <div className="p-3 space-y-2">
          {option.products.map((product, pIdx) => (
            <ProductCard
              key={product.id}
              product={product}
              onChange={p => onProductChange(pIdx, p)}
              onDelete={() => onProductDelete(pIdx)}
            />
          ))}
          <Button
            variant="outline"
            size="sm"
            className="w-full h-7 text-xs border-dashed"
            onClick={onProductAdd}
          >
            <Plus className="w-3 h-3 mr-1.5" />
            Add Product
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Main admin page ───────────────────────────────────────────────────────────

export default function AdminPage() {
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  const fetchCatalogue = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/admin/catalogue`);
      if (!res.ok) throw new Error(res.statusText);
      const data = await res.json();
      setSections(data.fitoutSections);
      setOpenSections(Object.fromEntries(data.fitoutSections.map((s: Section) => [s.id, true])));
      setDirty(false);
    } catch (e) {
      toast({ title: "Failed to load catalogue", description: String(e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCatalogue(); }, [fetchCatalogue]);

  const mutate = useCallback((fn: (prev: Section[]) => Section[]) => {
    setSections(fn);
    setDirty(true);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${BASE}/api/admin/catalogue`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fitoutSections: sections }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast({ title: "Catalogue saved successfully" });
      setDirty(false);
    } catch (e) {
      toast({ title: "Save failed", description: String(e), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // ── Section mutations ───────────────────────────────────────────────────────

  const updateSection = (sIdx: number, patch: Partial<Section>) =>
    mutate(prev => prev.map((s, i) => i === sIdx ? { ...s, ...patch } : s));

  const deleteSection = (sIdx: number) =>
    mutate(prev => prev.filter((_, i) => i !== sIdx));

  const addSection = () => {
    const name = "New Section";
    const id = uid("sec");
    mutate(prev => [...prev, { id, code: `S${prev.length + 1}`, name, options: [] }]);
    setOpenSections(prev => ({ ...prev, [id]: true }));
  };

  // ── Option mutations ────────────────────────────────────────────────────────

  const updateOption = (sIdx: number, oIdx: number, patch: Partial<Option>) =>
    mutate(prev => prev.map((s, i) => i !== sIdx ? s : {
      ...s, options: s.options.map((o, j) => j === oIdx ? { ...o, ...patch } : o),
    }));

  const deleteOption = (sIdx: number, oIdx: number) =>
    mutate(prev => prev.map((s, i) => i !== sIdx ? s : {
      ...s, options: s.options.filter((_, j) => j !== oIdx),
    }));

  const addOption = (sIdx: number) => {
    const name = "New Option";
    const opt: Option = { id: uid("opt"), code: `OPT${Date.now().toString(36).slice(-4).toUpperCase()}`, name, products: [] };
    mutate(prev => prev.map((s, i) => i !== sIdx ? s : { ...s, options: [...s.options, opt] }));
  };

  // ── Product mutations ───────────────────────────────────────────────────────

  const updateProduct = (sIdx: number, oIdx: number, pIdx: number, patch: Partial<Product>) =>
    mutate(prev => prev.map((s, i) => i !== sIdx ? s : {
      ...s, options: s.options.map((o, j) => j !== oIdx ? o : {
        ...o, products: o.products.map((p, k) => k === pIdx ? { ...p, ...patch } : p),
      }),
    }));

  const deleteProduct = (sIdx: number, oIdx: number, pIdx: number) =>
    mutate(prev => prev.map((s, i) => i !== sIdx ? s : {
      ...s, options: s.options.map((o, j) => j !== oIdx ? o : {
        ...o, products: o.products.filter((_, k) => k !== pIdx),
      }),
    }));

  const addProduct = (sIdx: number, oIdx: number) => {
    const name = "New Product";
    const prod: Product = { id: uid("prd"), code: `DDL-NEW-${Date.now().toString(36).slice(-4).toUpperCase()}`, name, cribbCodes: [] };
    mutate(prev => prev.map((s, i) => i !== sIdx ? s : {
      ...s, options: s.options.map((o, j) => j !== oIdx ? o : { ...o, products: [...o.products, prod] }),
    }));
  };

  // CribbTree mutations are handled internally by the CribbTree component —
  // they bubble up as updateProduct(sIdx, oIdx, pIdx, { cribbCodes: updated }).

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-2">
          <Database className="w-8 h-8 text-primary mx-auto animate-pulse" />
          <p className="text-sm text-muted-foreground">Loading catalogue…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* ── Sticky header ── */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-sm shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Designer
            </Link>
            <div className="w-px h-4 bg-border" />
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-primary" />
              <h1 className="text-base font-bold">Catalogue Admin</h1>
            </div>
            {dirty && (
              <span className="text-[10px] bg-amber-100 text-amber-700 border border-amber-200 rounded-full px-2 py-0.5 font-medium">
                Unsaved changes
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchCatalogue} disabled={saving}>
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
              Reload
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving || !dirty}>
              <Save className="w-3.5 h-3.5 mr-1.5" />
              {saving ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* ── Description ── */}
        <div className="mb-6 p-4 bg-primary/5 border border-primary/15 rounded-xl">
          <h2 className="text-sm font-semibold text-primary mb-1">Buildings Fit-out Catalogue</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Edit the fit-out sections, options, products and variants shown to customers.
            Each product's variants can be flat (e.g. 12 colours) or nested to any depth (e.g. Substrate → Brand → Colour).
            Use the <strong className="font-semibold">+</strong> button next to any variant to add a child level beneath it.
            Reference codes (DDL-xxx) are kept for back-end use — only display names need editing.
            Changes take effect in the designer immediately after saving.
          </p>
        </div>

        {/* ── Section tree ── */}
        <div className="space-y-4">
          {sections.map((section, sIdx) => {
            const isOpen = openSections[section.id] ?? true;
            return (
              <div key={section.id} className="border border-border rounded-xl bg-card shadow-sm overflow-hidden">
                {/* Section header */}
                <div className="flex items-center gap-2 px-4 py-3 bg-muted/30 border-b border-border">
                  <button
                    onClick={() => setOpenSections(prev => ({ ...prev, [section.id]: !isOpen }))}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                  <GripVertical className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                  <span className="text-[10px] font-mono text-muted-foreground w-10 shrink-0">{section.code}</span>
                  <Input
                    value={section.name}
                    onChange={e => updateSection(sIdx, { name: e.target.value })}
                    className="h-8 text-sm font-semibold max-w-xs"
                    placeholder="Section name…"
                  />
                  <span className="text-[10px] text-muted-foreground ml-2">
                    {section.options.length} option{section.options.length !== 1 ? "s" : ""}
                  </span>
                  <button
                    onClick={() => deleteSection(sIdx)}
                    className="ml-auto p-1.5 text-red-400 hover:text-red-600 rounded-md transition-colors hover:bg-red-50"
                    title="Delete section"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Options */}
                {isOpen && (
                  <div className="p-4 space-y-3">
                    {section.options.map((option, oIdx) => (
                      <OptionBlock
                        key={option.id}
                        option={option}
                        sIdx={sIdx}
                        oIdx={oIdx}
                        onNameChange={name => updateOption(sIdx, oIdx, { name })}
                        onDelete={() => deleteOption(sIdx, oIdx)}
                        onProductChange={(pIdx, p) => updateProduct(sIdx, oIdx, pIdx, p)}
                        onProductDelete={(pIdx) => deleteProduct(sIdx, oIdx, pIdx)}
                        onProductAdd={() => addProduct(sIdx, oIdx)}
                      />
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full h-8 text-xs border-dashed text-primary border-primary/30 hover:border-primary/60"
                      onClick={() => addOption(sIdx)}
                    >
                      <Plus className="w-3.5 h-3.5 mr-1.5" />
                      Add Option
                    </Button>
                  </div>
                )}
              </div>
            );
          })}

          {/* Add section */}
          <Button
            variant="outline"
            size="sm"
            className="w-full h-10 text-sm border-dashed text-primary border-primary/30 hover:border-primary/60"
            onClick={addSection}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Section
          </Button>
        </div>

        {/* ── Sticky save footer ── */}
        {dirty && (
          <div className="mt-8 pt-6 border-t border-border flex items-center justify-between">
            <p className="text-sm text-muted-foreground">You have unsaved changes.</p>
            <Button onClick={handleSave} disabled={saving} className="px-8">
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Saving…" : "Save All Changes"}
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
