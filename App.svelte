<script>
  import "./app.scss";
  import AddToDo from "./AddToDo.svelte";
  import { onMount } from "svelte";
  // var q = window.faunadb.query;
  // var serverClient = new faunadb.Client({
  //   secret: "fnAESOSOliACSRpFQnsUnCIPKHOpT-niV3y1OLZU",
  // });
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

<main>
  <div class="app-wrapper">
    <AddToDo bind:toDos={toDos}/>
    <div class="todo-list-wrapper">
      <ul class="todo-list">
        {#each toDos as toDo}
          <li class="todo-line">
            <div class="todo-label not-selectable">
              <label>
                <input type="checkbox" class="hidden-checkbox" />
                <span class="visible-checkbox" />
                {toDo?.data?.title}
              </label>
            </div>
            
            <div><button on:click={() => handelClick(toDo.ref)}>Slett</button></div>
          </li>
        {/each}
      </ul>
    </div>
  </div>
</main>

<style>
  .todo-list-wrapper {
    margin-top: 25px;
  }
  .todo-list {
    list-style-type: none;
    padding: 0;
    margin: 0;
  }
  .app-wrapper {
    padding: 5px;
    width: 100%;
    max-width: 360px;
    min-height: 67vh;
  }
  .todo-line {
    padding: 5px;
    margin-top: 7px;
    border-radius: 7px;
    box-shadow: 0 1px 0 2px rgba(0, 0, 0, 0.5);
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  label {
    display: flex;
  }
  .visible-checkbox {
    height: 1.2em;
    width: 1.2em;
    padding: 0.2em;
    background-color: rgba(255, 255, 255, 0.25);
    border-radius: 7px;
    margin-right: 9px;
  }
  .hidden-checkbox {
    width: 0;
  }
  .hidden-checkbox:checked ~ .visible-checkbox {
    background-color: rgba(255, 255, 255, 0.5);
  }
  .hidden-checkbox:checked ~ .visible-checkbox::before {
    content: url("check.svg");
  }
  .todo-label {
    padding-left: 0.7em;
    width: 100%;
    display: flex;
    justify-content: flex-start;
    align-items: center;
  }
</style>