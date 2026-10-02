"use client";

import { useSyncExternalStore } from "react";
import { gatewayStore, type GatewaySnapshot } from "./store";

/** Einzige Brücke zwischen Store und Oberfläche. */
export function useGateway(): GatewaySnapshot {
  return useSyncExternalStore(gatewayStore.subscribe, gatewayStore.getSnapshot, gatewayStore.getServerSnapshot);
}
