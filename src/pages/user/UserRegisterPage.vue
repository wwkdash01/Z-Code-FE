<template>
    <div id="UserRegisterPage">
        <h2 class="tittle">REGISTER</h2>
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
            { min: 6, message: '密码长度不能短于6'},
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

        <a-form-item
        name="confirmPassword"
        validateFirst
        :rules="[
          { required: true, message: '请输入确认密码!' },
          { min: 6, message: '密码长度不能短于6'},
          { validator: validateConfirmPassword, trigger: 'change'}
        ]"
        >
        <a-input-password v-model:value="formState.confirmPassword" placeholder = "请再次输入密码" />
        </a-form-item>

        <div class="tips">
          已有账号？
          <router-link to="/user/login">去登录</router-link>
        </div>

        <a-form-item>
        <a-button type="primary" html-type="submit" style="width: 100%">注册</a-button>
        </a-form-item>
        
        </a-form>
  </div>
</template>

<script lang="ts" setup>
import { userRegister } from '@/api/userController';
import { message } from 'ant-design-vue';
import { reactive } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();

const formState = reactive<API.UserRegisterRequestDTO>({
  userAccount: '',
  password: '',
  confirmPassword: '',
});

const validateConfirmPassword = (_rule: any, value:string) => {
    if (!value) {
        // 为空不触发比对
        return Promise.resolve();
    }
    
    if (value !== formState.password) {
        return Promise.reject('两次密码不一致');
    }
    
    // 校验通过
    return Promise.resolve();
}

const handleSubmit = async (values: any) => {
  const res = await userRegister(values);
  if (res.data.code === 200 && res.data.data) {
    message.success("注册成功")
    router.push({
      path: '/user/login',
      replace: true,
    })
  } else {
    message.error('注册失败，' + res.data.message)
  }
};

</script>

