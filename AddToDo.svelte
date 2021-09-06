<script>
  // var q = window.faunadb.query;
  // var serverClient = new faunadb.Client({
  //   secret: "fnAESOSOliACSRpFQnsUnCIPKHOpT-niV3y1OLZU",
  // });
  let value = "";
  export let toDos;
  async function handleClick() {
    // const data = await serverClient.query(
    //   q.Create(q.Collection("toDos"), {
    //     data: formData,
    //   }),
    // );
    toDos.push({ data: { title: value }, ref: { value: { id: Math.random() } } });
    toDos = toDos;
    value = "";
  }

  import "./app.scss";
</script>

<form class="todo-wrapper" on:submit|preventDefault={handleClick}>
  <div>
    <input required placeholder="Gjøremål" bind:value={value}/>
  </div>
  <button type="submit" >
    Legg til
  </button>
</form>

<style lang="scss">
  button {
    margin-top: 5px;
    width: 100%;
  }
</style>