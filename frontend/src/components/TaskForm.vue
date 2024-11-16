<template>
    <div class="task-form">
      <h3>{{ task ? 'Редактировать задание' : 'Создать задание' }}</h3>
      <div>
        <label>Выберите валютную пару:</label>
        <select v-model="form.currencyPair">
          <option v-for="pair in currencyPairs" :value="pair" :key="pair">{{ pair }}</option>
        </select>
      </div>
      <div>
        <label>Триггерная цена:</label>
        <input type="number" v-model.number="form.targetPrice" />
      </div>
      <button @click="handleSave">Сохранить</button>
      <button @click="$emit('cancel')">Отмена</button>
    </div>
  </template>
  
  <script>
  export default {
    props: {
      task: Object,
      currencyPairs: Array,
    },
    data() {
      return {
        form: { ...this.task } || { currencyPair: '', targetPrice: null },
      };
    },
    methods: {
      handleSave() {
        if (!this.form.currencyPair || !this.form.targetPrice) {
          alert('Заполните все поля');
          return;
        }
        this.$emit('save', { ...this.form });
      },
    },
  };
  </script>
  