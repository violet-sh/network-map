<script lang="ts">
	import type { ConnectionDetailsProps } from "$lib/types";

	let { providers, current_connection, logged_in, removeConnection, updateConnection }: ConnectionDetailsProps = $props();

	let type = $state(current_connection.type);
	let provider = $state(current_connection.provider);
	let cable = $state("");
	let route = $derived(JSON.stringify(current_connection.route.coordinates, null, 2));

	function selectProvider() {
		updateConnection(current_connection.id, { provider });
	}

	function selectType() {
		updateConnection(current_connection.id, { type });
	}

	function updateRoute() {
		const input = current_connection.route;
		input.coordinates = JSON.parse(route);
		updateConnection(current_connection.id, { route: JSON.stringify(input) });
	}
</script>

<div class="details">
	<p>
		<b>{current_connection.name}</b>
		{#if logged_in}
			<button class="delete" onclick={() => removeConnection(current_connection.id)} aria-label="Remove PoP">
				<i class="fa-solid fa-trash-can"></i>
			</button>
		{/if}
	</p>

	<br /><b>Type:</b>
	{#if logged_in}
		<select name="type" id="type" bind:value={type} onchange={selectType}>
			{#each ["long-haul", "regional", "metro"] as type (type)}
				<option value={type}>{type}</option>
			{/each}
		</select>
		<br />
	{:else}
		<span>{current_connection.type || "None"}</span>
		<br />
	{/if}

	<b>Provider:</b>
	{#if logged_in}
		<select name="provider" id="provider" bind:value={provider} onchange={selectProvider}>
			<option value="" selected>Self</option>
			{#each providers as provider (provider.id)}
				<option value={provider.id}>{provider.name}</option>
			{/each}
		</select>
	{:else}
		<span>{providers.find((provider) => provider.id === current_connection.provider)?.name || "Self"}</span>
		<br />
	{/if}

	{#if current_connection.cable}
		<p><b>Cable:</b> {current_connection.cable}</p>
	{/if}

	{#if logged_in}
		<p class="route-label"><b>Route:</b></p>
		<code><textarea class="route" bind:value={route}></textarea></code>
		<button onclick={updateRoute}>Update connection</button>
	{/if}
</div>

<style lang="scss">
	.details {
		position: absolute;
		z-index: 1;
		top: 1rem;
		left: 1rem;
		width: 16rem;
		padding: 0.75rem;
		border-radius: 0.25rem;
		background-color: white;
		font-size: 0.85rem;
		line-height: 1.5rem;
		box-shadow: 0 0 0.5rem 0 rgba(0, 0, 0, 0.2);
	}

	.route-label {
		margin-top: 0.75rem;
	}

	.route {
		width: 100% !important;
		height: 10rem;
		min-height: 5rem;
		max-height: 20rem;
		margin-bottom: 0.5rem;
		border-radius: 5px;
		border: 1px solid #ddd;
	}

	.delete {
		background-color: white;
		color: grey;
		position: absolute;
		right: 0.25rem;
		padding: 0.25rem;
	}
</style>
