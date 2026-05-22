#!/bin/bash
# ============================================================
# LinkChest Web 部署脚本 (deploy-web.sh)
# 
# 功能：
#   1. 部署前校验（代码推送、关键文件、备份当前构建）
#   2. 同步源码到运行目录
#   3. 清理缓存并重新构建
#   4. 重启服务并验证结果
#
# 使用方式：
#   ./deploy/deploy-web.sh
#
# 案例：CASE-S009 - 防止部署后功能回退
# 最后更新：2026-05-15
# ============================================================

set -e

# 配置变量
BASE_DIR="/opt/linkchest/api"
SRC_DIR="$BASE_DIR/project/apps/web"    # monorepo 源码目录
RUN_DIR="$BASE_DIR/apps/web"            # Next.js 运行目录
BACKUP_BASE="$BASE_DIR/backups"
LOG_FILE="$BASE_DIR/deploy/deploy-web.log"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

success() {
    log "${GREEN}✅ $1${NC}"
}

warn() {
    log "${YELLOW}⚠️  $1${NC}"
}

error() {
    log "${RED}❌ $1${NC}"
}

info() {
    log "${BLUE}ℹ️  $1${NC}"
}

# ============================================================
# 步骤 0: 环境检查
# ============================================================
check_environment() {
    info "=== 环境检查 ==="
    
    if [ ! -d "$BASE_DIR/.git" ]; then
        error "$BASE_DIR 不是 Git 仓库"
        exit 1
    fi
    
    if [ ! -d "$SRC_DIR/src" ]; then
        error "源码目录不存在: $SRC_DIR/src"
        exit 1
    fi
    
    if [ ! -d "$RUN_DIR" ]; then
        error "运行目录不存在: $RUN_DIR"
        exit 1
    fi
    
    success "环境检查通过"
}

# ============================================================
# 步骤 1: 部署前校验
# ============================================================
pre_deploy_check() {
    info "=== 部署前校验 ==="
    
    cd $BASE_DIR
    
    # 1.1 检查本地和远程代码一致性
    LOCAL_HASH=$(git rev-parse HEAD)
    REMOTE_HASH=$(git ls-remote origin HEAD 2>/dev/null | cut -f1)
    
    if [ -n "$REMOTE_HASH" ] && [ "$LOCAL_HASH" != "$REMOTE_HASH" ]; then
        warn "本地代码未推送到远程"
        info "  本地: ${LOCAL_HASH:0:8}"
        info "  远程: ${REMOTE_HASH:0:8}"
        
        read -p "是否继续？(y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            error "用户取消部署"
            exit 1
        fi
    else
        success "代码已同步 (commit: ${LOCAL_HASH:0:8})"
    fi
    
    # 1.2 检查关键文件版本（Sidebar.tsx 是否为统一管理入口）
    SIDEBAR_FILE="$SRC_DIR/src/components/Sidebar.tsx"
    if [ -f "$SIDEBAR_FILE" ]; then
        if grep -q "sidebar.manage" "$SIDEBAR_FILE"; then
            success "Sidebar 已更新为统一管理入口"
        else
            warn "Sidebar 可能仍为旧版独立入口"
            warn "请确认这是预期行为"
        fi
    else
        error "关键文件缺失: $SIDEBAR_FILE"
        exit 1
    fi
    
    # 1.3 备份当前运行版本
    BACKUP_DIR="$BACKUP_BASE/$(date +%Y%m%d_%H%M%S)"
    mkdir -p $BACKUP_DIR
    
    if [ -d "$RUN_DIR/.next" ]; then
        cp -r "$RUN_DIR/.next" "$BACKUP_DIR/" 2>/dev/null || true
        success "已备份当前构建到: $BACKUP_DIR"
    else
        warn "无现有构建产物可备份"
    fi
    
    # 记录当前 commit hash
    git rev-parse HEAD > "$BACKUP_DIR/commit-hash.txt"
}

# ============================================================
# 步骤 2: 拉取最新代码
# ============================================================
pull_code() {
    info "=== 拉取最新代码 ==="
    
    cd $BASE_DIR
    
    # 获取当前 commit
    BEFORE_PULL=$(git rev-parse HEAD)
    
    # 拉取最新代码
    git pull origin master || {
        error "Git pull 失败"
        exit 1
    }
    
    AFTER_PULL=$(git rev-parse HEAD)
    
    if [ "$BEFORE_PULL" = "$AFTER_PULL" ]; then
        warn "没有新的代码变更"
    else
        success "代码已更新: ${BEFORE_PULL:0:8} → ${AFTER_PULL:0:8}"
    fi
}

# ============================================================
# 步骤 3: 同步源码到运行目录
# ============================================================
sync_source() {
    info "=== 同步源码到运行目录 ==="
    
    # 同步核心源码
    if [ -d "$SRC_DIR/src" ]; then
        cp -rf "$SRC_DIR/src/"* "$RUN_DIR/src/"
        success "src/ 目录已同步"
    else
        error "源码 src/ 目录不存在"
        exit 1
    fi
    
    # 同步配置文件
    for FILE in package.json next.config.mjs next.config.js next.config.ts tsconfig.json tailwind.config.js postcss.config.js; do
        if [ -f "$SRC_DIR/$FILE" ]; then
            cp -f "$SRC_DIR/$FILE" "$RUN_DIR/$FILE" 2>/dev/null || true
        fi
    done
    success "配置文件已同步"
    
    # 同步 public 目录
    if [ -d "$SRC_DIR/public" ]; then
        cp -rf "$SRC_DIR/public/"* "$RUN_DIR/public/" 2>/dev/null || true
        success "public/ 目录已同步"
    fi
    
    # 验证同步结果
    diff_count=0
    for f in $(find "$SRC_DIR/src" -name "*.tsx" -o -name "*.ts" | head -10); do
        rel_path=${f#$SRC_DIR/}
        if ! cmp -s "$f" "$RUN_DIR/$rel_path" 2>/dev/null; then
            ((diff_count++))
        fi
    done
    
    if [ $diff_count -eq 0 ]; then
        success "源码同步验证通过"
    else
        warn "有 $diff_count 个文件可能未正确同步"
    fi
}

# ============================================================
# 步骤 4: 清理缓存并构建
# ============================================================
build_project() {
    info "=== 清理缓存并构建 ==="
    
    cd $RUN_DIR
    
    # 清理旧构建产物
    rm -rf .next
    success ".next 缓存已清理"
    
    # 执行构建
    info "开始构建..."
    npm run build || {
        error "构建失败！"
        error "查看上方日志获取详细错误信息"
        
        # 尝试回滚到备份
        LATEST_BACKUP=$(ls -dt $BACKUP_BASE/*/.next 2>/dev/null | head -1)
        if [ -n "$LATEST_BACKUP" ] && [ -d "$LATEST_BACKUP" ]; then
            warn "尝试回滚到上次成功构建..."
            cp -r "$LATEST_BACKUP" "$RUN_DIR/.next"
            pm2 restart linkchest-web
            warn "已回滚，请检查日志排查构建失败原因"
        fi
        
        exit 1
    }
    
    success "构建完成"
}

# ============================================================
# 步骤 5: 重启服务
# ============================================================
restart_service() {
    info "=== 重启服务 ==="
    
    pm2 restart linkchest-web || {
        error "PM2 重启失败"
        exit 1
    }
    
    # 等待服务启动
    sleep 3
    
    # 检查服务状态
    if pm2 status linkchest-web --no-color 2>/dev/null | grep -q "online"; then
        success "服务已启动且运行正常"
    else
        error "服务启动异常"
        pm2 logs linkchest-web --lines 20 --nostream
        exit 1
    fi
}

# ============================================================
# 步骤 6: 部署后验证
# ============================================================
post_deploy_verify() {
    info "=== 部署后验证 ==="
    
    cd $RUN_DIR
    
    # 6.1 检查 Sidebar 关键特征
    if grep -q "sidebar.manage" "src/components/Sidebar.tsx"; then
        success "Sidebar: 统一管理入口 ✅"
    else
        warn "Sidebar: 可能仍为独立入口 ⚠️"
    fi
    
    # 6.2 检查构建产物大小
    MANAGE_SIZE=$(stat -c%s ".next/server/app/manage.html" 2>/dev/null || echo "0")
    if [ "$MANAGE_SIZE" -gt 50000 ]; then
        success "/manage 页面大小正常 ($((MANAGE_SIZE/1024))kB)"
    else
        warn "/manage 页面可能未正确构建 (${MANAGE_SIZE}B)"
    fi
    
    # 6.3 检查重定向页面
    PASS_COUNT=0
    FAIL_COUNT=0
    for route in lists tags shares; do
        ROUTE_SIZE=$(stat -c%s ".next/server/app/$route.html" 2>/dev/null || echo "0")
        if [ "$ROUTE_SIZE" -lt 1000 ]; then
            ((PASS_COUNT++))
        else
            ((FAIL_COUNT++))
            warn "/$route 可能仍为独立页面 (${ROUTE_SIZE}B)"
        fi
    done
    
    if [ $PASS_COUNT -eq 3 ]; then
        success "重定向页面全部正常 (lists, tags, shares)"
    elif [ $FAIL_COUNT -gt 0 ]; then
        warn "有 $FAIL_COUNT 个路由可能未变为重定向"
    fi
    
    # 6.4 输出总结
    echo ""
    info "=== 部署总结 ==="
    info "时间: $(date '+%Y-%m-%d %H:%M:%S')"
    info "Commit: $(cd $BASE_DIR && git rev-parse --short HEAD)"
    info "备份位置: $BACKUP_DIR"
    
    if [ $FAIL_COUNT -eq 0 ]; then
        success "🎉 部署完成，所有检查项通过！"
    else
        warn "⚠️ 部署完成，但有 $FAIL_COUNT 项警告需要关注"
    fi
}

# ============================================================
# 主流程
# ============================================================
main() {
    echo ""
    echo "╔══════════════════════════════════════════════╗"
    echo "║     LinkChest Web 部署脚本 v1.0              ║"
    echo "║     参考: CASE-S009 部署回退防护             ║"
    echo "╚══════════════════════════════════════════════╝"
    echo ""
    
    check_environment
    pre_deploy_check
    pull_code
    sync_source
    build_project
    restart_service
    post_deploy_verify
    
    # 写入日志
    echo "" >> $LOG_FILE 2>/dev/null || true
    echo "--- Deploy completed at $(date '+%Y-%m-%d %H:%M:%S') ---" >> $LOG_FILE 2>/dev/null || true
}

main "$@"
