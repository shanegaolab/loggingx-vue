<template>
  <ElDialog
    v-model="dialogVisible"
    :title="dialogType === 'add' ? '添加用户' : '编辑用户'"
    width="30%"
    align-center
  >
    <ElForm ref="formRef" :model="formData" :rules="rules" label-width="80px">
      <ElFormItem label="用户名" prop="userName">
        <ElInput v-model="formData.userName" placeholder="请输入用户名" />
      </ElFormItem>
      <ElFormItem label="密码" prop="password">
        <ElInput
          v-model="formData.password"
          type="password"
          show-password
          autocomplete="new-password"
          :placeholder="dialogType === 'add' ? '请输入密码' : '留空表示不修改密码'"
        />
      </ElFormItem>
      <ElFormItem label="手机号" prop="userPhone">
        <ElInput v-model="formData.userPhone" placeholder="请输入手机号" />
      </ElFormItem>
      <ElFormItem label="邮箱" prop="userEmail">
        <ElInput v-model="formData.userEmail" placeholder="请输入邮箱" />
      </ElFormItem>
      <ElFormItem label="性别" prop="userGender">
        <ElSelect v-model="formData.userGender">
          <ElOption label="男" value="1" />
          <ElOption label="女" value="2" />
        </ElSelect>
      </ElFormItem>
      <ElFormItem label="状态" prop="status">
        <ElSelect v-model="formData.status">
          <ElOption label="在线" value="1" />
          <ElOption label="离线" value="2" />
          <ElOption label="异常" value="3" />
          <ElOption label="注销" value="4" />
        </ElSelect>
      </ElFormItem>
      <ElFormItem label="角色" prop="userRoles">
        <ElSelect v-model="formData.userRoles" multiple>
          <ElOption
            v-for="role in roleList"
            :key="role.roleCode"
            :value="role.roleCode"
            :label="role.roleName"
          />
        </ElSelect>
      </ElFormItem>
    </ElForm>
    <template #footer>
      <div class="dialog-footer">
        <ElButton @click="dialogVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="submitting" @click="handleSubmit">提交</ElButton>
      </div>
    </template>
  </ElDialog>
</template>

<script setup lang="ts">
  import { fetchCreateUser, fetchGetRoleOptions, fetchUpdateUser } from '@/api/system-manage'
  import { ElMessage, type FormInstance, type FormRules } from 'element-plus'

  interface Props {
    visible: boolean
    type: string
    userData?: Partial<Api.SystemManage.UserListItem>
  }

  interface Emits {
    (e: 'update:visible', value: boolean): void
    (e: 'submit'): void
  }

  const props = defineProps<Props>()
  const emit = defineEmits<Emits>()

  // 角色列表数据（启用的角色）
  const roleList = ref<Api.SystemManage.RoleListItem[]>([])
  const submitting = ref(false)

  // 对话框显示控制
  const dialogVisible = computed({
    get: () => props.visible,
    set: (value) => emit('update:visible', value)
  })

  const dialogType = computed(() => props.type)

  // 表单实例
  const formRef = ref<FormInstance>()

  // 表单数据
  const formData = reactive<Api.SystemManage.UserForm>({
    userName: '',
    password: '',
    userPhone: '',
    userEmail: '',
    userGender: '1',
    status: '1',
    userRoles: []
  })

  // 表单验证规则（密码仅新增时必填）
  const rules = computed<FormRules>(() => ({
    userName: [
      { required: true, message: '请输入用户名', trigger: 'blur' },
      { min: 2, max: 20, message: '长度在 2 到 20 个字符', trigger: 'blur' }
    ],
    password: [
      { required: dialogType.value === 'add', message: '请输入密码', trigger: 'blur' },
      { min: 8, max: 100, message: '长度在 8 到 100 个字符', trigger: 'blur' }
    ],
    userPhone: [
      { required: true, message: '请输入手机号', trigger: 'blur' },
      { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号格式', trigger: 'blur' }
    ],
    userEmail: [{ type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }],
    userGender: [{ required: true, message: '请选择性别', trigger: 'change' }],
    userRoles: [{ required: true, message: '请选择角色', trigger: 'change' }]
  }))

  /**
   * 加载可选角色
   */
  const loadRoleOptions = async () => {
    roleList.value = await fetchGetRoleOptions()
  }

  /**
   * 初始化表单数据
   * 根据对话框类型（新增/编辑）填充表单
   */
  const initFormData = () => {
    const row = props.type === 'edit' ? props.userData : undefined

    Object.assign(formData, {
      userName: row?.userName ?? '',
      password: '',
      userPhone: row?.userPhone ?? '',
      userEmail: row?.userEmail ?? '',
      userGender: row?.userGender ?? '1',
      status: row?.status ?? '1',
      userRoles: Array.isArray(row?.userRoles) ? [...row.userRoles] : []
    })
  }

  /**
   * 监听对话框状态变化
   * 当对话框打开时初始化表单数据、加载角色并清除验证状态
   */
  watch(
    () => [props.visible, props.type, props.userData],
    ([visible]) => {
      if (visible) {
        initFormData()
        loadRoleOptions()
        nextTick(() => {
          formRef.value?.clearValidate()
        })
      }
    },
    { immediate: true }
  )

  /**
   * 提交表单
   * 验证通过后调用新增/编辑接口，成功后通知父组件刷新
   */
  const handleSubmit = async () => {
    if (!formRef.value) return

    try {
      await formRef.value.validate()
    } catch {
      // 表单校验未通过，错误提示由表单自身展示
      return
    }

    submitting.value = true
    try {
      const payload = { ...formData, userEmail: formData.userEmail || undefined }
      if (dialogType.value === 'add') {
        await fetchCreateUser(payload)
      } else {
        await fetchUpdateUser(props.userData!.id!, payload)
      }
      ElMessage.success(dialogType.value === 'add' ? '添加成功' : '更新成功')
      emit('submit')
    } finally {
      submitting.value = false
    }
  }
</script>
