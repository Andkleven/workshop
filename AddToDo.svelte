<script>
  import { writable, get } from "svelte/store";
  var q = window.faunadb.query;
  var serverClient = new faunadb.Client({
    secret: "fnAESCbcTmACS_xZJEqITqgsxEcrVjPHqDVxkwk6",
  });

  export let toDos;
  const value = writable({});
  async function handleClick() {
    const formData = get(value);
    const data = await serverClient.query(
      q.Create(q.Collection("toDos"), {
        data: formData
      })
    );
    toDos.push(data);
    toDos = toDos;
    value.set({});
  }
</script>

<style>
  button {
    background: #ff3e00;
    color: white;
    border: none;
    margin-bottom: 20px;
    padding: 8px 12px;
    border-radius: 2px;
  }
  input {
    margin: 5px 0 20px 0;
  }
</style>

<div>
	<h1>Gjøremål</h1>
  <div>
  <label for="toDo">Gjøremål</label>
  </div>
  <div>
	<input bind:value={$value.title}/>
  </div>
  <div>
  <label for="details">Detaljer</label>
  </div>
  <div>
	<textarea  bind:value={$value.detail} />
  </div>
  <div>
	<button on:click|preventDefault={handleClick}>
  Lagre
  </button>
  </div>

</div>