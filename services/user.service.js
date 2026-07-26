const bcrypt = require("bcryptjs");
const userRepo = require("../repositories/user.repository");
const refreshTokenRepo = require("../repositories/refreshToken.repository");
const auditLogRepo = require("../repositories/auditLog.repository");
const prisma = require("../config/prisma");
const { NotFoundError, ConflictError, ForbiddenError } = require("../utils/errors");
const { AUDIT_ACTIONS } = require("../constants");
const { parsePagination } = require("../utils/helpers");

const SALT_ROUNDS = 12;

class UserService {
  async getAll(query) {
    const { page, limit, skip } = parsePagination(query);
    const where = {};
    if (query.role) where.role = query.role;
    if (query.active !== undefined) where.active = query.active === "true";

    const { data, total } = await userRepo.findAllPaginated({
      skip,
      take: limit,
      where,
    });
    return { data, total, page, limit };
  }

  async getById(id) {
    const user = await userRepo.findByIdSafe(id);
    if (!user) throw new NotFoundError("User not found");
    return user;
  }

  async create(data, actorId) {
    // Check email uniqueness
    const existing = await userRepo.findByEmail(data.email);
    if (existing) throw new ConflictError("Email already in use");

    const hashed = await bcrypt.hash(data.password, SALT_ROUNDS);
    const user = await userRepo.createUser({ ...data, password: hashed });

    await auditLogRepo.log({
      userId: actorId,
      action: AUDIT_ACTIONS.USER_CREATED,
      entity: "User",
      entityId: user.id,
      metadata: { name: user.name, role: user.role },
    });

    return user;
  }

  async update(id, data, actorId) {
    const existing = await userRepo.findByIdSafe(id);
    if (!existing) throw new NotFoundError("User not found");

    // If changing email, check uniqueness
    if (data.email && data.email !== existing.email) {
      const taken = await userRepo.findByEmail(data.email);
      if (taken) throw new ConflictError("Email already in use");
    }

    // If changing password, hash it
    if (data.password) {
      data.password = await bcrypt.hash(data.password, SALT_ROUNDS);
    }

    const updated = await userRepo.updateUser(id, data);

    await auditLogRepo.log({
      userId: actorId,
      action: AUDIT_ACTIONS.USER_UPDATED,
      entity: "User",
      entityId: id,
      metadata: { fields: Object.keys(data) },
    });

    return updated;
  }

  async delete(id, actorId) {
    const user = await userRepo.findByIdSafe(id);
    if (!user) throw new NotFoundError("User not found");

    if (user.role === "ADMIN") {
      throw new ForbiddenError("Cannot delete an admin account");
    }

    // Clean up related data first to satisfy foreign key constraints (like RESTRICT)
    await prisma.refreshToken.deleteMany({ where: { userId: id } });
    await prisma.auditLog.deleteMany({ where: { userId: id } });
    await prisma.order.deleteMany({ where: { cashierId: id } });

    await userRepo.delete(id);

    await auditLogRepo.log({
      userId: actorId,
      action: "USER_DELETED",
      entity: "User",
      entityId: id,
      metadata: { name: user.name, email: user.email, role: user.role },
    });
  }

  async deactivate(id, actorId) {
    const user = await userRepo.findByIdSafe(id);
    if (!user) throw new NotFoundError("User not found");

    const updated = await userRepo.updateUser(id, { active: false });

    // Revoke all refresh tokens so they can't use existing sessions
    await refreshTokenRepo.revokeAllForUser(id);

    await auditLogRepo.log({
      userId: actorId,
      action: AUDIT_ACTIONS.USER_DEACTIVATED,
      entity: "User",
      entityId: id,
    });

    return updated;
  }

  async activate(id, actorId) {
    const user = await userRepo.findByIdSafe(id);
    if (!user) throw new NotFoundError("User not found");

    const updated = await userRepo.updateUser(id, { active: true });

    await auditLogRepo.log({
      userId: actorId,
      action: AUDIT_ACTIONS.USER_UPDATED,
      entity: "User",
      entityId: id,
      metadata: { activated: true },
    });

    return updated;
  }
}

module.exports = new UserService();
