<script>
  import AddToDo from "./AddToDo.svelte";
  import { beforeUpdate } from "svelte";
  var q = window.faunadb.query;
  var serverClient = new faunadb.Client({
    secret: "fnAESCbcTmACS_xZJEqITqgsxEcrVjPHqDVxkwk6",
  });
  let toDos = [];

  beforeUpdate(async () => {
    const newToDos = await serverClient.query(
      Map(q.Paginate(q.Documents(q.Collection("toDos"))), q.Lambda(x => q.Get(x)))
    );
    toDos = newToDos.data;
  });
</script>

<style>
		main {
		  font-family: sans-serif;
		  text-align: center;
		}
		table {
		  margin-left: auto;
		  margin-right: auto;
		}
</style>

<main>
  <AddToDo bind:toDos={toDos}/>
  <table >
  {#each toDos as toDo}
    <tr> 
      <td>{toDo.data.title}</td>
      <td>{toDo.data.detail}</td>
      <td><input type="checkbox"/></td>
    </tr>
  {/each} 
  </table>

</main>