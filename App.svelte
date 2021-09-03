<script>
  import AddToDo from "./AddToDo";
  import { beforeUpdate } from "svelte";
  import { serverClient } from "./index";
  let toDos = [];
  import {
    Client,
    Map,
    Paginate,
    Documents,
    Collection,
    Get,
    Lambda
  } from "faunadb";

  beforeUpdate(async () => {
    const newToDos = await serverClient.query(
      Map(Paginate(Documents(Collection("toDos"))), Lambda(x => Get(x)))
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