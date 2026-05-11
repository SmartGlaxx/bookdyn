import { useMemo } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Users, GitBranch, Bug, CheckCircle2, Circle } from "lucide-react";
import type { Book, CharacterLedgerEntry, PlotTodo, PlotDone } from "@/types/book";

interface ContinuityPanelProps {
  book: Book;
}

const fmtRef = (ch?: number, sub?: number) => {
  if (ch === undefined || ch === null) return "—";
  const c = `Ch ${ch + 1}`;
  if (sub === undefined || sub === null) return c;
  return `${c} · §${sub + 1}`;
};

const ContinuityPanel = ({ book }: ContinuityPanelProps) => {
  const characters = book.characterLedger?.characters ?? [];
  const todos = book.plotLedger?.todos ?? [];
  const dones = book.plotLedger?.dones ?? [];

  const lastUpdated = useMemo(
    () => new Date(book.updatedAt).toLocaleString(),
    [book.updatedAt],
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            Continuity Director
          </span>
          <Badge variant="outline" className="text-[10px] font-normal">
            Updated {lastUpdated}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="characters">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="characters" className="gap-1.5">
              <Users className="w-3.5 h-3.5" />
              Characters
              <Badge variant="secondary" className="ml-1 text-[10px] px-1.5">{characters.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="plot" className="gap-1.5">
              <GitBranch className="w-3.5 h-3.5" />
              Plot Threads
              <Badge variant="secondary" className="ml-1 text-[10px] px-1.5">{todos.length}/{todos.length + dones.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="debug" className="gap-1.5">
              <Bug className="w-3.5 h-3.5" />
              Debug
            </TabsTrigger>
          </TabsList>

          <TabsContent value="characters" className="mt-4">
            {characters.length === 0 ? (
              <EmptyState message="No characters tracked yet. The ledger fills in as sections are written." />
            ) : (
              <ScrollArea className="h-[480px] pr-3">
                <div className="space-y-3">
                  {characters.map((c) => (
                    <CharacterCard key={c.id} entry={c} />
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          <TabsContent value="plot" className="mt-4">
            {todos.length === 0 && dones.length === 0 ? (
              <EmptyState message="No plot threads tracked yet. Threads are seeded from the outline and updated each section." />
            ) : (
              <ScrollArea className="h-[480px] pr-3">
                <div className="space-y-5">
                  <div>
                    <h4 className="text-xs uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
                      <Circle className="w-3 h-3" />
                      Open Todos ({todos.length})
                    </h4>
                    <div className="space-y-2">
                      {todos.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic">All threads resolved.</p>
                      ) : (
                        todos.map((t) => <TodoRow key={t.id} todo={t} />)
                      )}
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <h4 className="text-xs uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3 h-3" />
                      Completed Dones ({dones.length})
                    </h4>
                    <div className="space-y-2">
                      {dones.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic">Nothing resolved yet.</p>
                      ) : (
                        dones.map((d) => <DoneRow key={d.id} done={d} />)
                      )}
                    </div>
                  </div>
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          <TabsContent value="debug" className="mt-4">
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Raw ledger state after the most recent section. Auto-refreshes as new sections are generated.
              </p>
              <DebugBlock title="character_ledger" data={book.characterLedger ?? { characters: [] }} />
              <DebugBlock title="plot_ledger" data={book.plotLedger ?? { todos: [], dones: [] }} />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

const EmptyState = ({ message }: { message: string }) => (
  <div className="text-center py-10 text-sm text-muted-foreground border border-dashed rounded-lg">
    {message}
  </div>
);

const CharacterCard = ({ entry }: { entry: CharacterLedgerEntry }) => {
  const lastActivity = entry.lastSectionActivity;
  const hasActivity = Array.isArray(lastActivity) && lastActivity.length > 0;

  return (
    <div className="border rounded-lg p-3 bg-muted/30 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium text-sm">{entry.name}</p>
          {entry.aliases && entry.aliases.length > 0 && (
            <p className="text-[11px] text-muted-foreground">
              aka {entry.aliases.join(", ")}
            </p>
          )}
        </div>
        <Badge variant="outline" className="text-[10px]">
          Last seen: {fmtRef(entry.lastSeenChapterIndex, entry.lastSeenSubsectionIndex)}
        </Badge>
      </div>

      <BulletGroup label="Identity" items={entry.identity} />
      <BulletGroup label="Relationships" items={entry.relationships} />
      <BulletGroup label="Key Statements" items={entry.keyStatements} />

      <div>
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
          Last Section Activity
        </p>
        {hasActivity ? (
          <ul className="space-y-1">
            {(lastActivity as string[]).map((b, i) => (
              <li key={i} className="text-xs leading-snug pl-3 relative before:content-['•'] before:absolute before:left-0 before:text-primary">
                {b}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground italic">N/A — not in the latest section</p>
        )}
      </div>

      {entry.history && entry.history.length > 0 && (
        <details className="text-xs">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
            History ({entry.history.length})
          </summary>
          <ul className="mt-2 space-y-1">
            {entry.history.map((h, i) => (
              <li key={i} className="leading-snug pl-3 relative before:content-['•'] before:absolute before:left-0 before:text-muted-foreground">
                {h}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
};

const BulletGroup = ({ label, items }: { label: string; items?: string[] }) => {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">{label}</p>
      <ul className="space-y-1">
        {items.map((it, i) => (
          <li
            key={i}
            className="text-xs leading-snug pl-3 relative before:content-['•'] before:absolute before:left-0 before:text-primary"
          >
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
};

const TodoRow = ({ todo }: { todo: PlotTodo }) => (
  <div className="border rounded-md p-2.5 bg-muted/30 flex items-start gap-2">
    <Circle className="w-3.5 h-3.5 mt-0.5 text-muted-foreground shrink-0" />
    <div className="flex-1 min-w-0">
      <p className="text-sm leading-snug">{todo.text}</p>
      <div className="flex flex-wrap gap-1.5 mt-1.5">
        <Badge variant="secondary" className="text-[10px]">
          Introduced: {fmtRef(todo.introducedChapter, todo.introducedSubsection)}
        </Badge>
        {todo.assignedChapter !== undefined && (
          <Badge variant="outline" className="text-[10px]">
            Assigned: {fmtRef(todo.assignedChapter, todo.assignedSubsection)}
          </Badge>
        )}
      </div>
    </div>
  </div>
);

const DoneRow = ({ done }: { done: PlotDone }) => (
  <div className="border rounded-md p-2.5 bg-muted/30 flex items-start gap-2">
    <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 text-primary shrink-0" />
    <div className="flex-1 min-w-0">
      <p className="text-sm leading-snug">{done.text}</p>
      <div className="flex flex-wrap gap-1.5 mt-1.5">
        <Badge variant="secondary" className="text-[10px]">
          Introduced: {fmtRef(done.introducedChapter, done.introducedSubsection)}
        </Badge>
        <Badge variant="default" className="text-[10px]">
          Resolved: {fmtRef(done.completedChapter, done.completedSubsection)}
        </Badge>
      </div>
    </div>
  </div>
);

const DebugBlock = ({ title, data }: { title: string; data: unknown }) => (
  <details className="border rounded-md bg-muted/30" open>
    <summary className="cursor-pointer px-3 py-2 text-xs font-mono text-muted-foreground hover:text-foreground">
      {title}
    </summary>
    <ScrollArea className="h-[200px]">
      <pre className="text-[11px] font-mono p-3 whitespace-pre-wrap break-all">
        {JSON.stringify(data, null, 2)}
      </pre>
    </ScrollArea>
  </details>
);

export default ContinuityPanel;