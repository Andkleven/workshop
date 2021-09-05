<script>
  import "../app.scss";

  import AddToDo from "./AddToDo.svelte";
  import { onMount } from "svelte";
  var q = window.faunadb.query;
  var serverClient = new faunadb.Client({
    secret: "fnAESOSOliACSRpFQnsUnCIPKHOpT-niV3y1OLZU",
  });
  let toDos = [
    { data: { title: "test1", detail: "sdfasd" }, ref: { value: { id: "1" } } },
    { data: { title: "test2", detail: "sdfasd" } },
  ];
  async function handelClick(ref) {
    // await serverClient.query(
    //   q.Delete(q.Ref(q.Collection("toDos"), ref.value.id)),
    // );
    toDos = toDos.filter((todo) => todo.ref !== ref);
  }
  // onMount(async () => {
  //   if (toDos.length === 0) {
  //     const newToDos = await serverClient.query(
  //       q.Map(
  //         q.Paginate(q.Documents(q.Collection("toDos"))),
  //         q.Lambda((x) => q.Get(x)),
  //       ),
  //     );
  //     toDos = newToDos.data;
  //   }
  // });
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
      <td><button on:click={() => handelClick(toDo.ref)}>Delete</button></td>
    </tr>
  {/each} 
  </table>
</main>