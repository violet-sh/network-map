<script lang="ts">
	import "normalize.css/normalize.css";
	import "@fortawesome/fontawesome-free/css/fontawesome.css";
	import "@fortawesome/fontawesome-free/css/solid.css";
	import "maplibre-gl/dist/maplibre-gl.css";

	import Map from "$lib/Map.svelte";
	import PopDetails from "$lib/PopDetails.svelte";
	import ConnectionDetails from "$lib/ConnectionDetails.svelte";
	import Create from "$lib/Create.svelte";

	import { invalidateAll } from "$app/navigation";
	import { trpc } from "$lib/trpc/client";
	import { onMount } from "svelte";

	import type { Connection, Pop } from "$lib/types";

	let { data } = $props();
	const pops = $derived(data.pops);
	const exchanges = $derived(data.exchanges);
	const connections = $derived(data.connections);
	const providers = $derived(data.providers);
	const popsJson = $derived(data.popsJson);
	const connectionsJson = $derived(data.connectionsJson);
	const user = $derived(data.user);

	let logged_in = $derived(user !== null);

	let current_pop: Pop | null = $state(null);
	let current_connection: Connection | null = $state(null);

	let create_open = $state(false);

	let map: Map;

	onMount(() => {
		const refresh = setInterval(() => {
			invalidateAll();
		}, 30_000);

		return () => {
			clearInterval(refresh);
		};
	});

	async function addPop(id: string, peeringdbId: number, type: string, provider: string) {
		const input = { id, peeringdbId, type, provider };
		await trpc().addPop.mutate(input);
		await invalidateAll();
		create_open = false;
		map.update();
	}

	async function updatePop(id: string, { type, provider }: { type?: string; provider?: string }) {
		const input = { id, type, provider };
		await trpc().updatePop.mutate(input);
		await invalidateAll();
		selectPop(id);
		map.update();
	}

	async function removePop(id: string) {
		const input = { id };
		await trpc().deletePop.mutate(input);
		await invalidateAll();
		deselectPop();
		map.update();
	}

	async function addConnection(pop1: string, pop2: string, type: string, provider: string, cable: string) {
		const input = { pops: [pop1, pop2], type, provider, cable };
		await trpc().addConnection.mutate(input);
		await invalidateAll();
		create_open = false;
		map.update();
	}

	async function updateConnection(id: string, input: { pops?: string[]; type?: string; provider?: string; cable?: string; route?: string }) {
		await trpc().updateConnection.mutate({ id, ...input });
		await invalidateAll();
		selectConnection(current_connection!);
		map.update();
	}

	async function removeConnection(id: string) {
		const input = { id };
		await trpc().deleteConnection.mutate(input);
		await invalidateAll();
		deselectConnection();
		map.update();
	}

	async function addExchange(pop: string, id: number) {
		const input = { pop, id };
		await trpc().addExchangeToPop.mutate(input);
		await invalidateAll();
		selectPop(pop);
		map.update();
	}

	async function removeExchange(pop: string, id: number) {
		const input = { pop, id };
		await trpc().removeExchangeFromPop.mutate(input);
		await invalidateAll();
		selectPop(pop);
		map.update();
	}

	async function addProvider(name: string, color: string) {
		const input = { name, color };
		await trpc().addProvider.mutate(input);
		await invalidateAll();
		create_open = false;
		map.update();
	}

	function selectPop(id: string) {
		current_pop = pops.find((pop) => pop.id === id) || null;
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
	<Create {pops} {providers} {addPop} {addConnection} {addProvider} />
{/if}

{#if current_pop != null}
	<PopDetails {connections} {exchanges} {providers} {current_pop} {logged_in} {updatePop} {removePop} {addExchange} {removeExchange} />
{/if}

{#if current_connection != null}
	<ConnectionDetails {providers} {current_connection} {logged_in} {removeConnection} {updateConnection} />
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
