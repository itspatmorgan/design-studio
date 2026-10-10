import { Tabs, TabsList, TabsTrigger, TabsContent } from './tabs';
export function ArtifactExamples() {
  return <Tabs defaultValue="view">
    <TabsList variant="line" aria-label="Artifact example">
      <TabsTrigger value="view">View</TabsTrigger>
      <TabsTrigger value="diagram">Diagram</TabsTrigger>
      <TabsTrigger value="canvas" disabled>Canvas (unavailable)</TabsTrigger>
    </TabsList>
    <TabsContent value="view" className="pt-4 text-sm text-muted-foreground">A working interface built with the assigned system.</TabsContent>
    <TabsContent value="diagram" className="pt-4 text-sm text-muted-foreground">A portable Mermaid model of the idea.</TabsContent>
    <TabsContent value="canvas" className="pt-4">Unavailable example.</TabsContent>
  </Tabs>;
}
