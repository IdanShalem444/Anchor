"use client";

import { useEffect, useRef, useState } from "react";
import {
  Plus,
  Type,
  StickyNote as StickyIcon,
  Spline,
  Trash2,
  Network,
  X,
} from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/misc";
import { useData } from "@/store/data";
import { uid } from "@/lib/format";
import type { MindEdge, MindNode } from "@/lib/types";
import { cn } from "@/lib/cn";

const NODE_W = 176;
const NODE_H = 64;

export default function PlanningPage() {
  const d = useData((s) => s.data());
  const createMap = useData((s) => s.createMap);
  const deleteMap = useData((s) => s.deleteMap);
  const [activeId, setActiveId] = useState<string | null>(d.mindmaps[0]?.id ?? null);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    if (!activeId && d.mindmaps[0]) setActiveId(d.mindmaps[0].id);
  }, [activeId, d.mindmaps]);

  const active = d.mindmaps.find((m) => m.id === activeId) ?? d.mindmaps[0];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Planning</h1>
          <p className="mt-1 text-sm text-ink-muted">An infinite whiteboard for mind maps, ideas and sticky notes.</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {d.mindmaps.map((m) => (
          <button
            key={m.id}
            onClick={() => setActiveId(m.id)}
            className={cn(
              "group flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors",
              active?.id === m.id ? "bg-anchor/10 text-anchor" : "bg-black/[0.04] text-ink-soft hover:bg-black/[0.07]"
            )}
          >
            {m.name}
            <X
              size={12}
              className="opacity-0 transition-opacity hover:text-red-600 group-hover:opacity-60"
              onClick={(e) => {
                e.stopPropagation();
                deleteMap(m.id);
                if (active?.id === m.id) setActiveId(null);
              }}
            />
          </button>
        ))}
        <div className="flex items-center gap-1.5">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New map name"
            className="h-9 w-36 text-[13px]"
            onKeyDown={(e) => {
              if (e.key === "Enter" && newName.trim()) {
                const m = createMap(newName.trim());
                setActiveId(m.id);
                setNewName("");
              }
            }}
          />
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              const m = createMap(newName.trim() || "Untitled map");
              setActiveId(m.id);
              setNewName("");
            }}
          >
            <Plus size={14} /> Map
          </Button>
        </div>
      </div>

      {!active ? (
        <div className="mt-8">
          <EmptyState
            icon={Network}
            title="Create your first mind map"
            description="Add a map above, then drop text and sticky nodes onto the canvas and connect your ideas."
          />
        </div>
      ) : (
        <Canvas key={active.id} mapId={active.id} />
      )}
    </div>
  );
}

function Canvas({ mapId }: { mapId: string }) {
  const map = useData((s) => s.data().mindmaps.find((m) => m.id === mapId));
  const updateMap = useData((s) => s.updateMap);
  const [nodes, setNodes] = useState<MindNode[]>(map?.nodes ?? []);
  const [edges, setEdges] = useState<MindEdge[]>(map?.edges ?? []);
  const [connectMode, setConnectMode] = useState(false);
  const [connectFrom, setConnectFrom] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const drag = useRef<{ id: string; px: number; py: number; nx: number; ny: number } | null>(null);

  function commit(nextNodes: MindNode[], nextEdges: MindEdge[]) {
    updateMap(mapId, { nodes: nextNodes, edges: nextEdges });
  }

  function addNode(kind: "text" | "sticky") {
    const n: MindNode = {
      id: uid("nd"),
      x: 80 + Math.random() * 220,
      y: 60 + Math.random() * 160,
      text: kind === "sticky" ? "Sticky note" : "New idea",
      kind,
      color: kind === "sticky" ? "#fde68a" : undefined,
    };
    const next = [...nodes, n];
    setNodes(next);
    commit(next, edges);
    setEditingId(n.id);
  }

  function onPointerDown(e: React.PointerEvent, node: MindNode) {
    if (editingId) return;
    if (connectMode) {
      if (!connectFrom) setConnectFrom(node.id);
      else if (connectFrom !== node.id) {
        if (!edges.some((ed) => ed.from === connectFrom && ed.to === node.id)) {
          const next = [...edges, { id: uid("ed"), from: connectFrom, to: node.id }];
          setEdges(next);
          commit(nodes, next);
        }
        setConnectFrom(null);
      }
      return;
    }
    drag.current = { id: node.id, px: e.clientX, py: e.clientY, nx: node.x, ny: node.y };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  }

  function onPointerMove(e: PointerEvent) {
    const dr = drag.current;
    if (!dr) return;
    setNodes((cur) =>
      cur.map((n) =>
        n.id === dr.id
          ? { ...n, x: Math.max(0, dr.nx + (e.clientX - dr.px)), y: Math.max(0, dr.ny + (e.clientY - dr.py)) }
          : n
      )
    );
  }

  function onPointerUp() {
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
    if (drag.current) {
      setNodes((cur) => {
        commit(cur, edges);
        return cur;
      });
      drag.current = null;
    }
  }

  function updateText(id: string, text: string) {
    const next = nodes.map((n) => (n.id === id ? { ...n, text } : n));
    setNodes(next);
    commit(next, edges);
  }

  function removeNode(id: string) {
    const nextNodes = nodes.filter((n) => n.id !== id);
    const nextEdges = edges.filter((e) => e.from !== id && e.to !== id);
    setNodes(nextNodes);
    setEdges(nextEdges);
    commit(nextNodes, nextEdges);
  }

  const center = (id: string) => {
    const n = nodes.find((x) => x.id === id);
    return n ? { x: n.x + NODE_W / 2, y: n.y + NODE_H / 2 } : { x: 0, y: 0 };
  };

  return (
    <div className="mt-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Button size="sm" variant="secondary" onClick={() => addNode("text")}>
          <Type size={14} /> Text
        </Button>
        <Button size="sm" variant="secondary" onClick={() => addNode("sticky")}>
          <StickyIcon size={14} /> Sticky
        </Button>
        <Button
          size="sm"
          variant={connectMode ? "primary" : "ghost"}
          onClick={() => {
            setConnectMode((v) => !v);
            setConnectFrom(null);
          }}
        >
          <Spline size={14} /> {connectMode ? "Connecting…" : "Connect"}
        </Button>
        <span className="text-[12px] text-ink-faint">
          {connectMode ? "Click two nodes to link them" : "Drag to move · double-click to edit"}
        </span>
      </div>

      <GlassCard className="overflow-auto p-0">
        <div
          className="relative"
          style={{
            width: 1600,
            height: 1000,
            backgroundImage:
              "radial-gradient(circle, rgba(22,24,29,0.06) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
        >
          <svg className="pointer-events-none absolute inset-0 h-full w-full">
            {edges.map((e) => {
              const a = center(e.from);
              const b = center(e.to);
              return (
                <line
                  key={e.id}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke="rgba(251,92,61,0.5)"
                  strokeWidth={2}
                />
              );
            })}
          </svg>

          {nodes.map((n) => (
            <div
              key={n.id}
              onPointerDown={(e) => onPointerDown(e, n)}
              onDoubleClick={() => setEditingId(n.id)}
              className={cn(
                "group absolute select-none rounded-2xl p-3 shadow-soft transition-shadow",
                connectMode ? "cursor-pointer" : "cursor-grab active:cursor-grabbing",
                connectFrom === n.id && "ring-2 ring-anchor",
                n.kind === "sticky" ? "shadow-md" : "glass-strong"
              )}
              style={{
                left: n.x,
                top: n.y,
                width: NODE_W,
                minHeight: NODE_H,
                backgroundColor: n.kind === "sticky" ? n.color : undefined,
              }}
            >
              <button
                onClick={() => removeNode(n.id)}
                className="absolute -right-2 -top-2 grid h-5 w-5 place-items-center rounded-full bg-white text-ink-faint opacity-0 shadow ring-1 ring-black/5 transition-opacity hover:text-red-600 group-hover:opacity-100"
              >
                <X size={11} />
              </button>
              {editingId === n.id ? (
                <textarea
                  autoFocus
                  defaultValue={n.text}
                  onBlur={(e) => {
                    updateText(n.id, e.target.value);
                    setEditingId(null);
                  }}
                  className="h-full w-full resize-none bg-transparent text-[13px] text-ink focus:outline-none"
                  rows={2}
                />
              ) : (
                <p className="whitespace-pre-wrap break-words text-[13px] text-ink">{n.text}</p>
              )}
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
