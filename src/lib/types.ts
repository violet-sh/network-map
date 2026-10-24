import type { FeatureCollection, LineString, Point } from "drizzle-postgis";

export type Cuid2 = string;

export type RegionCode = string;
export type PoPId = string;
export type ExchangeId = string;

// Core types
//
// NOTE: A provider is the network that owns/operates a specific asset
//
export interface Region {
	code: RegionCode; // Usually based on air port code
	name: string;
}

export interface PoP {
	id: PoPId; // Region code + index, e.g. `nyc1`
	type:
		| "core" // Part of the long-haul backbone, ROADM + router
		| "edge" // Local PoP, ROADM + router
		| "cls" // Cable Landing Station, ROADM
		| "ila"; // In-Line Amplifier, ROADM
	name: string;
	region: RegionCode;
	address: string;
	coordinates: number[];
	provider: Cuid2;
	peeringdbId?: number | null;
	exchanges: ExchangeId[];
}

export interface Exchange {
	id: ExchangeId;
	name: string;
	cacheTimestamp: Date; // Time of last update, re-fetched accoring to cache TTL
}

export interface Segment {
	id: Cuid2;
	type: "subsea" | "underground" | "aerial";
	rightOfWay: "highway" | "railway" | "power line" | "road" | null;
	geometry: LineString;
}

export interface Route {
	id: Cuid2;
	type: "long-haul" | "metro";
	name: string | null;
	provider: Cuid2;
	pops: PoPId[];
	segments: Cuid2[];
	status: "proposal" | "under construction" | "active";
	available: {
		waves: boolean;
		fiber: boolean;
	};
}

export interface Wave {
	id: Cuid2;
	pops: PoPId[];
	provider: Cuid2;
	route: Cuid2 | null;
}

export interface Network {
	id: Cuid2;
	type: "carrier" | "custom";
	name: string;
	color: string;
	pops: PoPId[];
	waves: Cuid2[];
	routes: Cuid2[]; // Dark fiber
}

// Auth
export interface User {
	id: Cuid2;
	githubId: number;
	username: string;
}

export interface Session {
	id: Cuid2;
	secretHash: string;
	userId: Cuid2;
	createdAt: Date;
	lastVerifiedAt: Date | null;
}

// Component props
export interface PopDetailsProps {
	connections: Connection[];
	exchanges: Exchange[];
	providers: Provider[];
	current_pop: PoP;
	logged_in: boolean;

	updatePop: (id: string, { type, provider }: { type?: string; provider?: string }) => void;
	removePop: (id: string) => void;
	addExchange: (pop: string, id: number) => void;
	removeExchange: (pop: string, id: number) => void;
}

export interface ConnectionDetailsProps {
	providers: Provider[];
	current_connection: Connection;
	logged_in: boolean;

	removeConnection: (id: string) => void;
	updateConnection: (id: string, input: { pops?: string[]; type?: string; provider?: string; cable?: string; route?: string }) => void;
}

export interface MapProps {
	pops: PoP[];
	connections: Connection[];
	providers: Provider[];
	popsJson: FeatureCollection<Point>;
	connectionsJson: FeatureCollection<LineString>;

	selectPop: (id: string) => void;
	deselectPop: () => void;
	selectConnection: (connection: Connection) => void;
	deselectConnection: () => void;
}

export interface CreateProps {
	pops: PoP[];
	providers: Provider[];

	addPop: (id: string, peeringdbId: number, type: string, provider: string) => void;
	addConnection: (pop1: string, pop2: string, type: string, provider: string, cable: string) => void;
	addProvider: (name: string, color: string) => void;
}
