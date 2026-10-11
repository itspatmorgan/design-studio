import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/systems/studio/components/tabs';

export const Default = () => (
  <Tabs defaultValue='overview' className='w-xs'>
    <TabsList>
      <TabsTrigger value='overview'>Overview</TabsTrigger>
      <TabsTrigger value='views'>Views</TabsTrigger>
      <TabsTrigger value='notes'>Notes</TabsTrigger>
    </TabsList>
    <TabsContent value='overview' className='text-muted-foreground'>
      Overview content.
    </TabsContent>
    <TabsContent value='views' className='text-muted-foreground'>
      Views content.
    </TabsContent>
    <TabsContent value='notes' className='text-muted-foreground'>
      Notes content.
    </TabsContent>
  </Tabs>
);
