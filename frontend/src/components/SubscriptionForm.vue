<template>
    <div class="subscription-form">
      <h3 v-if="!isSubscribed">Оформите подписку</h3>
      <h3 v-else>Вы уже подписаны!</h3>
  
      <div v-if="!isSubscribed">
        <label>Введите номер телефона:</label>
        <input
          type="tel"
          v-model="phoneNumber"
          placeholder="+1234567890"
          required
        />
        <button @click="subscribe">Оформить подписку</button>
      </div>
  
      <div v-if="isSubscribed">
        <p>Ваш номер телефона: {{ phoneNumber }}</p>
        <button @click="cancelSubscription">Отменить подписку</button>
      </div>
    </div>
  </template>
  
  <script>
  import { checkSubscription, createSubscription, cancelSubscription } from '@/services/subscriptionService';
  
  export default {
    data() {
      return {
        isSubscribed: false,
        phoneNumber: '',
      };
    },
    methods: {
      async subscribe() {
        if (!this.phoneNumber.match(/^\+\d{10,15}$/)) {
          alert('Введите корректный номер телефона в международном формате.');
          return;
        }
        try {
          await createSubscription(this.phoneNumber);
          this.isSubscribed = true;
          alert('Подписка оформлена!');
        } catch (error) {
          console.error('Ошибка оформления подписки:', error);
          alert('Не удалось оформить подписку. Попробуйте позже.');
        }
      },
      async cancelSubscription() {
        try {
          await cancelSubscription();
          this.isSubscribed = false;
          this.phoneNumber = '';
          alert('Подписка отменена.');
        } catch (error) {
          console.error('Ошибка отмены подписки:', error);
          alert('Не удалось отменить подписку. Попробуйте позже.');
        }
      },
      async loadSubscriptionStatus() {
        try {
          const subscription = await checkSubscription();
          this.isSubscribed = subscription.isActive;
          this.phoneNumber = subscription.phoneNumber || '';
        } catch (error) {
          console.error('Ошибка проверки подписки:', error);
        }
      },
    },
    mounted() {
      this.loadSubscriptionStatus();
    },
  };
  </script>
  