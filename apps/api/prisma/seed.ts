import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding XBuild database...');

  // Company singleton
  await prisma.company.upsert({
    where: { singleton: true },
    update: {},
    create: {
      name: 'XBuild Demo Company',
      emoji: '🏢',
      locale: 'vi-VN',
      timezone: 'Asia/Ho_Chi_Minh',
      ownerId: '00000000-0000-0000-0000-000000000001',
      defaultInviteRoleSlug: 'member',
      sessionTimeoutMin: 480,
    },
  });
  console.log('✅ Company singleton created');

  // Role templates
  const roles = [
    {
      slug: 'admin',
      name: 'Quản trị viên',
      description: 'Toàn quyền trên hệ thống, trừ billing',
      color: '#D93025',
      emoji: '👑',
      isSystem: true,
      permissions: [
        'company.manage_settings',
        'member.list', 'member.invite', 'member.set_role', 'member.set_permissions',
        'member.suspend', 'member.remove',
        'role.list', 'role.create', 'role.update', 'role.delete', 'role.apply_to_users',
        'team.list', 'team.create', 'team.update', 'team.manage_members', 'team.delete',
        'task.delegate.self', 'task.delegate.cancel',
        'approval.delegate.self', 'approval.delegate.cancel',
        'collection.list', 'collection.create', 'collection.update', 'collection.delete',
        'collection.manage_schema', 'collection.manage_api_keys', 'collection.manage_webhooks',
        'record.list', 'record.read', 'record.create', 'record.update', 'record.delete',
        'record.import', 'record.export',
        'workflow.list', 'workflow.read', 'workflow.create', 'workflow.update',
        'workflow.publish', 'workflow.delete', 'workflow.run.start', 'workflow.run.cancel',
        'workflow.run.override', 'workflow.run.reassign',
        'file.upload', 'file.download', 'file.delete', 'file.share',
        'folder.create', 'folder.update', 'folder.delete',
        'agent.chat', 'agent.copilot',
        'audit.read',
        'settings.read', 'settings.manage', 'settings.ai.manage', 'settings.smtp.manage',
        'settings.branding.manage',
        'app_template.list', 'app_template.read', 'app_template.view_marketplace',
        'app_template.import', 'app_template.install', 'app_template.update',
        'app_template.uninstall', 'app_template.create', 'app_template.delete',
        'app_template.export',
      ],
    },
    {
      slug: 'manager',
      name: 'Quản lý',
      description: 'Quản lý nhóm, duyệt workflow, xem báo cáo',
      color: '#1A73E8',
      emoji: '👔',
      isSystem: true,
      permissions: [
        'member.list',
        'team.list', 'team.create', 'team.update', 'team.manage_members',
        'task.delegate.self', 'task.delegate.cancel',
        'approval.delegate.self', 'approval.delegate.cancel',
        'collection.list',
        'record.list', 'record.read', 'record.create', 'record.update',
        'record.import', 'record.export',
        'workflow.list', 'workflow.read', 'workflow.run.start', 'workflow.run.cancel',
        'workflow.run.reassign',
        'file.upload', 'file.download', 'file.share',
        'folder.create',
        'agent.chat',
        'audit.read',
        'settings.read',
        'app_template.list', 'app_template.read',
      ],
    },
    {
      slug: 'member',
      name: 'Nhân viên',
      description: 'Tạo bản ghi, chạy workflow, hoàn thành task',
      color: '#1E8E3E',
      emoji: '👤',
      isSystem: true,
      permissions: [
        'member.list',
        'team.list',
        'task.delegate.self',
        'approval.delegate.self',
        'collection.list',
        'record.list', 'record.read', 'record.create', 'record.update',
        'record.export',
        'workflow.list', 'workflow.read', 'workflow.run.start',
        'file.upload', 'file.download',
        'folder.create',
        'agent.chat',
        'app_template.list',
      ],
    },
    {
      slug: 'viewer',
      name: 'Người xem',
      description: 'Chỉ xem, không tạo hay sửa dữ liệu',
      color: '#F9AB00',
      emoji: '👁️',
      isSystem: true,
      permissions: [
        'member.list',
        'team.list',
        'collection.list',
        'record.list', 'record.read', 'record.export',
        'workflow.list', 'workflow.read',
        'file.download',
        'app_template.list',
      ],
    },
    {
      slug: 'guest',
      name: 'Khách',
      description: 'Quyền hạn chế, thời gian xác định',
      color: '#5F6368',
      emoji: '🔒',
      isSystem: true,
      permissions: [
        'collection.list',
        'record.list', 'record.read',
        'workflow.list',
      ],
    },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { slug: role.slug },
      update: { ...role },
      create: { ...role },
    });
  }
  console.log(`✅ ${roles.length} roles seeded`);

  // Default system settings
  const settings = [
    { key: 'ai.provider', value: 'openai', valueType: 'string' as const, category: 'ai', description: 'AI provider name' },
    { key: 'ai.model', value: 'gpt-4o-mini', valueType: 'string' as const, category: 'ai', description: 'Default AI model' },
    { key: 'ai.embedding_model', value: 'text-embedding-3-small', valueType: 'string' as const, category: 'ai', description: 'Embedding model' },
    { key: 'ai.max_tokens', value: 2048, valueType: 'number' as const, category: 'ai', description: 'Max tokens per request' },
    { key: 'ai.enabled', value: true, valueType: 'boolean' as const, category: 'ai', description: 'Enable AI features' },
    { key: 'notification.email.enabled', value: false, valueType: 'boolean' as const, category: 'notification', description: 'Enable email notifications' },
    { key: 'notification.in_app.enabled', value: true, valueType: 'boolean' as const, category: 'notification', description: 'Enable in-app notifications' },
    { key: 'workflow.max_nodes', value: 100, valueType: 'number' as const, category: 'workflow', description: 'Maximum nodes per workflow' },
    { key: 'workflow.max_definition_size_kb', value: 256, valueType: 'number' as const, category: 'workflow', description: 'Max workflow JSON size in KB' },
    { key: 'workflow.default_task_sla_hours', value: 48, valueType: 'number' as const, category: 'workflow', description: 'Default task SLA hours' },
    { key: 'file.max_upload_mb', value: 50, valueType: 'number' as const, category: 'file', description: 'Max file upload size in MB' },
    { key: 'file.allowed_types', value: ['image/*', 'application/pdf', 'application/vnd.openxmlformats-officedocument.*', 'text/csv'], valueType: 'json' as const, category: 'file', description: 'Allowed MIME types' },
    { key: 'branding.app_name', value: 'XBuild', valueType: 'string' as const, category: 'branding', description: 'App name' },
    { key: 'branding.primary_color', value: '#1A73E8', valueType: 'color' as const, category: 'branding', description: 'Primary color' },
    { key: 'feature.marketplace.enabled', value: true, valueType: 'boolean' as const, category: 'feature', description: 'Enable marketplace' },
    { key: 'feature.virtual_agent.enabled', value: true, valueType: 'boolean' as const, category: 'feature', description: 'Enable virtual agent' },
  ];

  for (const setting of settings) {
    await prisma.appSetting.upsert({
      where: { key: setting.key },
      update: {},
      create: {
        key: setting.key,
        value: setting.value,
        valueType: setting.valueType,
        category: setting.category,
        description: setting.description,
        encrypted: false,
        autoload: true,
      },
    });
  }
  console.log(`✅ ${settings.length} settings seeded`);

  console.log('🎉 Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
