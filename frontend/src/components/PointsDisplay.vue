<template>
    <div class="points-display">
      <h3>Ваши накопленные очки: {{ points }}</h3>
    </div>
  </template>
  
  <script>
  export default {
    props: {
      points: {
        type: Number,
        required: true,
      },
    },
  };
  </script>
  