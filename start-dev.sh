#!/bin/bash

# DEX 开发环境一键启动脚本
# 自动部署合约 + 启动所有服务

set -e

echo "🚀 DEX 开发环境启动中..."
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 项目根目录
PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"

# 检查 Docker 服务
echo "📦 检查 Docker 服务..."
if ! docker ps &>/dev/null; then
    echo -e "${RED}❌ Docker 未运行，请先启动 Docker${NC}"
    exit 1
fi

# 启动 PostgreSQL 和 Redis
echo "🐘 启动数据库服务..."
cd "$PROJECT_ROOT/backend"
docker-compose up -d
sleep 3

# 检查 Hardhat 节点是否已运行
if ! curl --noproxy '*' -s http://127.0.0.1:8545 -X POST -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' &>/dev/null; then
    echo "⛓️  启动 Hardhat 节点..."
    cd "$PROJECT_ROOT/contracts"
    npx hardhat node &
    HARDHAT_PID=$!
    echo "   Hardhat PID: $HARDHAT_PID"
    sleep 5
else
    echo -e "${YELLOW}⚠️  Hardhat 节点已在运行${NC}"
fi

# 检查是否需要部署合约（通过检查区块号）
BLOCK_NUM=$(curl --noproxy '*' -s http://127.0.0.1:8545 -X POST -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' | grep -o '"result":"[^"]*"' | cut -d'"' -f4)

if [ "$BLOCK_NUM" = "0x0" ]; then
    echo ""
    echo "📝 部署智能合约..."
    cd "$PROJECT_ROOT/contracts"
    npx hardhat run scripts/deploy.ts --network localhost

    echo ""
    echo "📊 部署价格预言机..."
    npx hardhat run scripts/deploy-oracle.ts --network localhost

    echo ""
    echo "💧 添加初始流动性..."
    npx hardhat run scripts/add-liquidity.ts --network localhost
else
    echo -e "${GREEN}✅ 合约已部署 (区块: $BLOCK_NUM)${NC}"
fi

# 启动后端服务
echo ""
echo "🔧 启动后端服务..."
cd "$PROJECT_ROOT/backend/services/analytics-service"
if ! pgrep -f "nest.*analytics" &>/dev/null; then
    pnpm run start:dev &
    sleep 3
else
    echo -e "${YELLOW}⚠️  后端服务已在运行${NC}"
fi

# 同步池子数据
echo ""
echo "🔄 同步池子数据到数据库..."
cd "$PROJECT_ROOT"
bash scripts/sync-all-pools.sh 2>/dev/null || true

# 启动前端
echo ""
echo "🌐 启动前端..."
cd "$PROJECT_ROOT/frontend/web-app"
if ! pgrep -f "vite" &>/dev/null; then
    pnpm run dev &
    sleep 2
else
    echo -e "${YELLOW}⚠️  前端已在运行${NC}"
fi

echo ""
echo "============================================"
echo -e "${GREEN}🎉 DEX 开发环境启动完成！${NC}"
echo "============================================"
echo ""
echo "📍 访问地址："
echo "   前端:     http://localhost:3000"
echo "   后端 API: http://localhost:3002"
echo "   Hardhat:  http://127.0.0.1:8545"
echo ""
echo "📝 测试账户："
echo "   地址: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
echo "   私钥: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
echo ""
echo "💡 提示: 按 Ctrl+C 停止所有服务"
echo ""

# 等待用户中断
wait
