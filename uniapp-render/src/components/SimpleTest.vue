<template>
  <view class="local-simple-test">
    <text>npm 组件（本地版）</text>
    <text>收到的 message: {{ message }}</text>
  </view>
</template>

<script lang="ts">
import { defineComponent, toRef } from 'vue'

export default defineComponent({
  name: 'npmSimpleTest',
  props: {
    message: {
      type: String,
      default: ''
    }
  }
})
</script>

<style scoped>
.local-simple-test {
  padding: 20rpx;
  background: #c8e6c9;
  border-radius: 8rpx;
  margin-top: 10rpx;
}
</style>
