<script lang="ts">
	import type { CreateProps } from "$lib/types";

	let type = $state("pop");

	let id = $state("");
	let peeringdbId = $state("");
	let popType = $state("");
	let popProvider = $state("");

	let pop1 = $state("");
	let pop2 = $state("");
	let connectionType = $state("");
	let connectionProvider = $state("");
	let cable = $state("");

	let name = $state("");
	let color = $state("");

	let { pops, providers, addPop, addConnection, addProvider }: CreateProps = $props();

	const orderedPops = pops.toSorted((pop1, pop2) => pop1.id.localeCompare(pop2.id));
	const orderedProviders = providers.toSorted((provider1, provider2) => provider1.name.localeCompare(provider2.name));

	function onsubmit(event: SubmitEvent) {
		event.preventDefault();
		switch (type) {
			case "pop":
				addPop(id, Number.parseInt(peeringdbId), popType, popProvider);
				break;
			case "connection":
				addConnection(pop1, pop2, connectionType, connectionProvider, cable);
				break;
			case "provider":
				addProvider(name, color);
				break;
			default:
				console.log(`Unknown type "${type}"`);
		}
	}
</script>

<form class="create" {onsubmit}>
	<div class="type">
		<input type="radio" id="pop" name="type" value="pop" bind:group={type} />
		<label for="pop">PoP</label>
		<input type="radio" id="connection" name="type" value="connection" bind:group={type} />
		<label for="connection">Connection</label>
		<input type="radio" id="provider" name="type" value="provider" bind:group={type} />
		<label for="provider">Provider</label>
	</div>
	{#if type === "pop"}
		<input bind:value={id} placeholder="ID" required />
		<input bind:value={peeringdbId} placeholder="PeeringDB ID" required />
		<select name="popType" id="popType" bind:value={popType} required>
			<option value="" disabled selected hidden>Select PoP type</option>
			{#each ["core", "edge", "cls", "ila"] as popType (popType)}
				<option value={popType}>{popType}</option>
			{/each}
		</select>
		<select name="provider" id="provider" bind:value={popProvider} required>
			<option value="" disabled selected hidden>Select provider</option>
			<option value="">Self</option>
			{#each orderedProviders as provider (provider.id)}
				<option value={provider.id}>{provider.name}</option>
			{/each}
		</select>
		<button type="submit">Create PoP</button>
	{:else if type === "connection"}
		<input list="pop1" bind:value={pop1} placeholder="PoP 1" required />
		<datalist id="pop1">
			{#each orderedPops as pop (pop.id)}
				<option value={pop.id}>{pop.id}</option>
			{/each}
		</datalist>
		<input list="pop2" bind:value={pop2} placeholder="PoP 2" required />
		<datalist id="pop2">
			{#each orderedPops as pop (pop.id)}
				<option value={pop.id}>{pop.id}</option>
			{/each}
		</datalist>
		<select name="connectionType" id="connectionType" bind:value={connectionType} required>
			<option value="" disabled selected hidden>Select connection type</option>
			{#each ["long-haul", "regional", "metro"] as connectionType (connectionType)}
				<option value={connectionType}>{connectionType}</option>
			{/each}
		</select>
		<select name="provider" id="provider" bind:value={connectionProvider} required>
			<option value="" disabled selected hidden>Select provider</option>
			<option value="">Self</option>
			{#each orderedProviders as provider (provider.id)}
				<option value={provider.id}>{provider.name}</option>
			{/each}
		</select>
		<input bind:value={cable} placeholder="Cable" />
		<button type="submit">Create Connection</button>
	{:else if type === "provider"}
		<input bind:value={name} placeholder="Name" required />
		<input bind:value={color} placeholder="Color" required />
		<button type="submit">Create Provider</button>
	{:else}
		<p>Error: unknown type "{type}""</p>
	{/if}
</form>

<style lang="scss">
	.create {
		position: absolute;
		z-index: 1;
		top: 4rem;
		right: 1rem;
		background-color: white;
		border: none;
		border-radius: 0.25rem;
		padding: 1rem;
		display: flex;
		flex-direction: column;
		box-shadow: 0 0 0.5rem 0 rgba(0, 0, 0, 0.2);
	}

	.type {
		display: flex;
		justify-content: space-evenly;
		margin-bottom: 1rem;

		label {
			color: #333;
			cursor: pointer;
		}

		input:checked + label {
			border-bottom: 2px lightgrey solid;
		}
	}

	input[type="radio"] {
		display: none;
	}
</style>
