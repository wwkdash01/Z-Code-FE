<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { getAppById } from '@/api/appController';
import { message } from 'ant-design-vue';
import AppInfoCard from '@/components/AppInfoCard.vue';
import ChatBoard from '@/components/Chat/ChatBoard.vue';
import TestAiResponseCard from '@/components/test/TestAiResponseCard.vue';

const testAppId = ref('452586928545873920')

const app = ref<API.AppVO>()

async function fetchAppById(appId: string) {
    const re = await getAppById({id: appId})
    if (re.data.code === 200 && re.data.data) {
        app.value = re.data.data as unknown as API.AppVO
    } else {
        message.warn('获取app失败')
    }
}

onMounted(async () => {
    await fetchAppById(testAppId.value)
})

</script>

<template>
    <div class="test-page">
        <div class="left-panel">
            <div class="app-info">
                <AppInfoCard :appId="testAppId" />
            </div>
            <div class="chat-board-wrapper">
                <ChatBoard :app-id="testAppId" />
            </div>
        </div>
        <div class="right-panel">
            <TestAiResponseCard :app-id="testAppId" user-prompt="个人主页，20行以内" />
        </div>
    </div>
</template>

<style scoped>
.test-page {
    display: flex;
    gap: 10px;
    height: calc(100vh - 8vh - 8vh - 24px);
}

.left-panel {
    display: flex;
    flex-direction: column;
    flex: 1;
    background: red;
}

.app-info {
    flex: 1;
    background-color: aqua;
}

.chat-board-wrapper {
    flex: 7;
    background-color: #fff;
    border: 1px solid #f0f0f0;
    border-radius: 8px;
    overflow: hidden;
}

.right-panel {
    flex: 2;
    background: green;
}
</style>
