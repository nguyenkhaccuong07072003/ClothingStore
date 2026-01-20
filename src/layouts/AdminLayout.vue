<template>
  <el-container class="admin-layout">
    <!-- Mobile Overlay -->
    <div
      v-if="isMobileMenuOpen"
      class="mobile-overlay"
      @click="isMobileMenuOpen = false"
    ></div>

    <!-- Sidebar -->
    <el-aside
      :width="sidebarWidth"
      class="sidebar"
      :class="{ 'mobile-open': isMobileMenuOpen }"
    >
      <div class="logo">
        <span v-if="!isCollapsed || isMobile">Clothing Admin</span>
        <el-icon v-else><Shop /></el-icon>
      </div>

      <el-menu
        :default-active="activeMenu"
        :collapse="isCollapsed && !isMobile"
        router
        background-color="#304156"
        text-color="#bfcbd9"
        active-text-color="#409EFF"
        @select="handleMenuSelect"
      >
        <el-menu-item index="/">
          <el-icon><DataLine /></el-icon>
          <span>Dashboard</span>
        </el-menu-item>

        <el-menu-item index="/products">
          <el-icon><Goods /></el-icon>
          <span>Sản phẩm</span>
        </el-menu-item>

        <el-menu-item index="/categories">
          <el-icon><Menu /></el-icon>
          <span>Danh mục</span>
        </el-menu-item>

        <el-menu-item index="/orders">
          <el-icon><List /></el-icon>
          <span>Đơn hàng</span>
        </el-menu-item>

        <el-menu-item index="/vouchers">
          <el-icon><Ticket /></el-icon>
          <span>Voucher</span>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <!-- Main Content -->
    <el-container class="main-container">
      <!-- Header -->
      <el-header class="header">
        <div class="header-left">
          <el-icon
            class="collapse-btn mobile-menu-btn"
            @click="toggleMenu"
          >
            <Fold v-if="!isCollapsed && !isMobile" />
            <Expand v-else />
          </el-icon>
        </div>

        <div class="header-right">
          <el-dropdown @command="handleCommand">
            <span class="user-info">
              <el-avatar :size="32" icon="User" />
              <span class="username">{{ authStore.user?.full_name || 'Admin' }}</span>
              <el-icon><ArrowDown /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">
                  <el-icon><User /></el-icon>
                  Thông tin tài khoản
                </el-dropdown-item>
                <el-dropdown-item divided command="logout">
                  <el-icon><SwitchButton /></el-icon>
                  Đăng xuất
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <!-- Main -->
      <el-main class="main-content">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const isCollapsed = ref(false)
const isMobile = ref(false)
const isMobileMenuOpen = ref(false)

const MOBILE_BREAKPOINT = 768

const sidebarWidth = computed(() => {
  if (isMobile.value) {
    return '220px'
  }
  return isCollapsed.value ? '64px' : '220px'
})

const activeMenu = computed(() => {
  return route.path
})

function checkMobile() {
  isMobile.value = window.innerWidth < MOBILE_BREAKPOINT
  if (!isMobile.value) {
    isMobileMenuOpen.value = false
  }
}

function toggleMenu() {
  if (isMobile.value) {
    isMobileMenuOpen.value = !isMobileMenuOpen.value
  } else {
    isCollapsed.value = !isCollapsed.value
  }
}

function handleMenuSelect() {
  if (isMobile.value) {
    isMobileMenuOpen.value = false
  }
}

function handleCommand(command) {
  if (command === 'logout') {
    authStore.logout()
    router.push('/login')
  } else if (command === 'profile') {
    router.push('/profile')
  }
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})
</script>

<style lang="scss" scoped>
.admin-layout {
  height: 100vh;
}

.mobile-overlay {
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 998;
}

.sidebar {
  background-color: #304156;
  transition: width 0.3s, transform 0.3s;
  overflow: hidden;
  z-index: 999;

  .logo {
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-size: 18px;
    font-weight: bold;
    background-color: #263445;
  }

  .el-menu {
    border-right: none;
  }
}

.header {
  background: #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;

  .header-left {
    display: flex;
    align-items: center;

    .collapse-btn {
      font-size: 20px;
      cursor: pointer;
      color: #606266;

      &:hover {
        color: #409EFF;
      }
    }
  }

  .header-right {
    .user-info {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;

      .username {
        color: #606266;
      }
    }
  }
}

.main-content {
  background-color: #f5f7fa;
  padding: 20px;
  overflow-y: auto;
}

// Mobile responsive
@media screen and (max-width: 768px) {
  .mobile-overlay {
    display: block;
  }

  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    height: 100vh;
    transform: translateX(-100%);

    &.mobile-open {
      transform: translateX(0);
    }
  }

  .main-container {
    width: 100%;
  }

  .header {
    padding: 0 12px;

    .header-right {
      .user-info {
        .username {
          display: none;
        }
      }
    }
  }

  .main-content {
    padding: 12px;
  }
}
</style>
