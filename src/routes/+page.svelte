<script lang="ts">
	import "normalize.css/normalize.css";
	import "@fortawesome/fontawesome-free/css/fontawesome.css";
	import "@fortawesome/fontawesome-free/css/solid.css";
	import "maplibre-gl/dist/maplibre-gl.css";

	import Map from "#lib/Map.svelte";
	import PopDetails from "#lib/PopDetails.svelte";
	import ConnectionDetails from "#lib/ConnectionDetails.svelte";
	import Create from "#lib/Create.svelte";

	import { invalidateAll } from "$app/navigation";
	import { orpc } from "#lib/orpc/client.ts";
	import { onMount } from "svelte";
	import { createQuery } from "@tanstack/svelte-query";

	import type { Network, PoP } from "#lib/types.ts";
	import type { FeatureCollection, LineString, Point } from "geojson";
	import type { PageProps } from "./$types";

	let { data }: PageProps = $props();
	const user = $derived(data.user);

	const pops = createQuery(() => orpc.getPops.queryOptions());
	const exchanges = createQuery(() => orpc.getExchanges.queryOptions());
	const connections = createQuery(() => orpc.getConnections.queryOptions());
	const providers = createQuery(() => orpc.getProviders.queryOptions());

	const popsJson: FeatureCollection<Point> = $derived({
		type: "FeatureCollection",
		features: pops.data?.map((pop) => {
			return {
				type: "Feature",
				geometry: {
					type: "Point",
					coordinates: pop.coordinates
				},
				properties: {
					id: pop.id,
					provider: providers.data?.findIndex((provider) => provider.id === pop.provider)
				}
			};
		})
	});
	const connectionsJson: FeatureCollection<LineString> = $derived({
		type: "FeatureCollection",
		features: user
			? connections.data?.map((connection) => {
					const geometry = connection.route;

					return {
						type: "Feature",
						geometry,
						properties: {
							id: connection.id,
							provider: providers.data?.findIndex((provider) => provider.id === connection.provider)
						}
					};
				})
			: []
	});

	let logged_in = $derived(user !== null);

	let current_pop: PoP | null = $state(null);
	let current_connection: Connection | null = $state(null);

	let create_open = $state(false);

	let map: Map;

	function selectPop(id: string) {
		current_pop = pops.data?.find((pop) => pop.id === id) || null;
	}

	function deselectPop() {
		current_pop = null;
	}

	function selectConnection(connection: Connection) {
		current_connection = connection;
	}

	function deselectConnection() {
		current_connection = null;
	}

	function refreshMap() {
		invalidateAll();
		map.update();
	}
</script>

<svelte:head>
	<title>Network Map</title>
</svelte:head>

{#if logged_in}
	<a href="/logout" class="btn float-right logout">
		<i class="fa-solid fa-user"></i> Logout
	</a>
	<button class="btn float-right create" onclick={() => (create_open = !create_open)} aria-label="Create new PoP">
		<i class="fa-solid fa-plus icon" style="rotate: {create_open ? 45 : 0}deg"></i>
	</button>
{:else}
	<a href="/login/github" class="btn float-right">
		<i class="fa-solid fa-user"></i> Login
	</a>
{/if}

{#if create_open}
	<Create {pops} {providers} {refreshMap} />
{/if}

{#if current_pop != null}
	<PopDetails {connections} {exchanges} {providers} {current_pop} {logged_in} {refreshMap} />
{/if}

{#if current_connection != null}
	<ConnectionDetails {providers} {current_connection} {logged_in} {refreshMap} />
{/if}

<Map
	{pops}
	{connections}
	{providers}
	{popsJson}
	{connectionsJson}
	{selectPop}
	{deselectPop}
	{selectConnection}
	{deselectConnection}
	bind:this={map}
/>

<style lang="scss">
	.logout {
		top: 0.85rem !important;
		right: 4rem !important;
	}

	.create {
		height: 2rem;
		width: 2rem;
		padding: 0 !important;
	}

	.btn {
		color: black;
		text-decoration: none;
		background-color: white;
		border: none;
		border-radius: 0.25rem;
		padding: 0.65rem;
		cursor: pointer;
		box-shadow: 0 0 0.5rem 0 rgba(0, 0, 0, 0.2);
	}

	.float-right {
		position: absolute;
		top: 1rem;
		right: 1rem;
		z-index: 1;
	}

	.icon {
		transition: all 0.1s ease-in;
	}

	:global(body) {
		font-family: sans-serif;
	}

	:global(input) {
		padding: 0.3rem;
		margin-bottom: 0.75rem;
		border: solid 2px #ddd;
		border-radius: 0.25rem;
	}

	:global(select) {
		padding: 0.3rem;
		margin-bottom: 0.75rem;
		border: solid 2px #ddd;
		border-radius: 0.25rem;
	}

	:global(button) {
		border: none;
		border-radius: 0.25rem;
		padding: 0.3rem;
		cursor: pointer;
		transition: background-color 0.1s ease-in;
	}

	:global(p) {
		margin: 0;
	}

	:global(ul) {
		margin: 0;
		padding-left: 1rem;
	}

	:global(a) {
		color: #6d28d9;
	}
</style>
