<template>
    <div id="UserLoginPage">
        <h2 class="tittle">NO CODE & NO PAPER</h2>
        <div class="desc">Modeling is all you need</div>
        <a-form
        :model="formState"
        name="basic"
        autocomplete="off"
        @finish="handleSubmit"
    >
        <a-form-item
        name="userAccount"
        :rules="[
          { required: true, message: '请输入账号!' },
          { min: 6, message: '密码长度不能短于6'}
        ]"
        >
        <a-input v-model:value="formState.userAccount" placeholder="请输入账号" />
        </a-form-item>

        <a-form-item
        name="password"
        :rules="[
          { required: true, message: '请输入密码!' },
          { min: 6, message: '密码长度不能短于6'}
        ]"
        >
        <a-input-password v-model:value="formState.password" placeholder = "请输入密码" />
        </a-form-item>

        <div class="tips">
          没有账号？
          <router-link to="/user/register">去注册</router-link>
        </div>

        <a-form-item>
        <a-button type="primary" html-type="submit" style="width: 100%">登录</a-button>
        </a-form-item>
        
        </a-form>
  </div>
</template>
<script lang="ts" setup>
import { userLogin } from '@/api/userController';
import { useLoginUserStore } from '@/stores/loginUser';
import { message } from 'ant-design-vue';
import { onMounted, reactive } from 'vue';
import { useRouter, useRoute } from 'vue-router';

const loginUserStore = useLoginUserStore();
const router = useRouter();
const route = useRoute();

const formState = reactive<API.UserLoginRequestDTO>({
  userAccount: '',
  password: '',
});

const handleSubmit = async (values: any) => {
  const res = await userLogin(values);
  if (res.data.code === 200 && res.data.data) {
    await loginUserStore.fetchLoginUser();
    message.success("登录成功")
    router.push({
      path: '/',
      replace: true,
    })
  } else {
    message.error('登录失败，' + res.data.message)
  }
};

onMounted(() => {
  if (route.query.prompt_login) {
    message.warning('请先登录');
    router.replace({query: {redirect: route.query.redirect}});
  }
})

</script>

