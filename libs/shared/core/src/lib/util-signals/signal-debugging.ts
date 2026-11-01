import { inject, Injector, afterRenderEffect, untracked } from '@angular/core';

export function injectSignalsLogger(): void {
  const injector = inject(Injector);
  const getSignalGraph = () =>
    (
      window as Window & { ng?: { ɵgetSignalGraph: (injector: Injector) => SignalGraph } }
    ).ng?.ɵgetSignalGraph(injector);
  const transformToDebugNames = (graph: {
    edges: { consumer: number; producer: number }[];
    nodes: { label: string; kind: string; value: unknown }[];
  }) =>
    graph.edges.map((edge: { consumer: number; producer: number }) => ({
      consumer: graph.nodes[edge.consumer].label,
      producer: graph.nodes[edge.producer].label,
    }));

  afterRenderEffect(() =>
    untracked(() => {
      const graph = getSignalGraph();
      if (!graph) return;
      console.table(graph.nodes);
      console.table(transformToDebugNames(graph));
    }),
  );
}

interface SignalGraph {
  edges: { consumer: number; producer: number }[];
  nodes: { label: string; kind: string; value: unknown }[];
}
