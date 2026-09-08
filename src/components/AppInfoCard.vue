<script setup lang="ts">
import { getAppById, updateAppById } from '@/api/appController';
import { getImgDegradation } from '@/utils/getImgDegradation';
import { Avatar, message } from 'ant-design-vue';
import { onMounted, ref } from 'vue'
import { InfoCircleFilled, SettingOutlined, EditOutlined } from '@ant-design/icons-vue'

const props = defineProps<{ appId: string}>()
const appVO = ref<API.AppVO>()
const editAppName = ref('')
const previousAppName = ref('')

async function updateAppCover(coverURL:string) {
    message.info("更新图片mock")
}

function onInputBlur(e: Event) {
    const newVal = (e.target as HTMLInputElement).value
    if (!newVal || newVal === appVO.value?.appName) return

    updateAppName(newVal)
}

async function updateAppName(appName: string) {
    if (appName === previousAppName.value) return
    previousAppName.value = appName
    // 调用updateAppById更新
    const re = await updateAppById({id: props.appId}, { appName })

    if (re.data.code === 200) {
        message.success('更新成功')
    } else {
        message.error('更新失败')
    }
    
    await fetchApp(props.appId)
}

async function fetchApp(appId:string) {
    if (!appId) return
    const re = await getAppById({id: appId})

    if (re.data.code === 200 && re.data.data) {
        appVO.value = re.data.data as unknown as API.AppVO
        console.log('appName loaded: ', appVO.value.appName)
        editAppName.value = appVO.value.appName!
        previousAppName.value = appVO.value.appName!
        console.log('EditAppName loaded: ', editAppName.value)
    } else {
        message.error('获取应用信息失败')
    }
}

onMounted(async () => {
    await fetchApp(props.appId)
})

</script>

<template>

    <div class="app-info-card">

        <div class="avatar-div" @click="updateAppCover('')">
            <a-upload>
                <Avatar class="avatar" :src="getImgDegradation(appVO?.cover)" :size="50" />
            </a-upload>
        </div>

        <div class="app-detail">
            <a-input class="appName" :bordered="false" v-model:value="editAppName" style="text-align:center;" @blur="onInputBlur" />
            <span class="createTime">{{ appVO?.createTime }}</span>
        </div>

        <div class="edit-btn">
            <a-popover trigger="click" :arrow="false" :overlayInnerStyle="{ padding:'5px' }">
                <template #content>

                    <a-card class="app-detail-card" style="width: 300px; padding: 0;">
                        <template #cover>
                            <img
                                alt="example"
                                :src="getImgDegradation(appVO?.cover)"
                            />
                        </template>

                        <template #actions>
                            <a-tag color="pink">{{ appVO?.appTag }}</a-tag>
                            <a-tag color="blue">{{ appVO?.codeGenType }}</a-tag>
                        </template>

                        <a-card-meta :title="appVO?.appName" :description="appVO?.initPrompt">

                        <template #avatar>
                            <a-avatar :src="getImgDegradation(appVO?.userAvatar)" />
                        </template>
                        
                        </a-card-meta>
                    </a-card>

                </template>

                <InfoCircleFilled class="info-icon"/>
            </a-popover>

        </div>

    </div>

</template>

<style scoped>
.app-info-card {
    padding-left: 10%;
    padding-right: 10%;
    /* background-color: antiquewhite; */
    height: 100%;
    width: 100%;

    display: flex;
}

.app-detail {
    flex: 5;
    margin-left: 3%;
    margin-right: 5%;
    /* background-color: aqua; */

    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
}

.appName {
    padding: 0;
}

.createTime {
    font-size: 10px;
    color: #999;
    margin-top: 4px;
}

.avatar-div {
    flex: 2;
    /* background-color: brown; */
    cursor: pointer;

    display: flex;
    align-items: center;
    justify-content: center;
    
}

.edit-btn {
    flex: 1;
    /* background-color: green; */
    
    display: flex;
    justify-content: center;
    align-items: center;
}

.avatar {
    position: relative;
    overflow: hidden;
    border: 2px solid gray;
}
.avatar::after {
    
    content: '';
    position: absolute;
    inset: 0;

    /* background-color: rgba(0, 0, 0, 0.4); */
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23fff' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4'/%3E%3Cpolyline points='17 8 12 3 7 8'/%3E%3Cline x1='12' y1='3' x2='12' y2='15'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: center;
    background-size: 20px;

    opacity: 0;
    transition: opacity 0.2s;
    pointer-events: none;
}
.avatar:hover::after {
    opacity: 1;
}

.info-icon {
    font-size: 17px;
    color: #999;
    cursor: pointer;
}

</style>