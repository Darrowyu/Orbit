---
name: auth-implementation-patterns
description: Master authentication and authorization patterns including JWT, OAuth2, session management, and RBAC to build secure, scalable access control systems. Use when implementing auth systems, securing APIs, or debugging security issues.
---

## Authentication & Authorization Patterns

Comprehensive patterns for building secure auth systems.

### When to Use This Skill

- Implementing JWT authentication
- Building RBAC systems
- Securing API endpoints
- Designing permission systems
- Debugging auth issues

### JWT Implementation (NestJS)

#### Auth Module Setup
```typescript
// auth.module.ts
@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '15m' },
    }),
    PassportModule,
  ],
  providers: [AuthService, JwtStrategy, LocalStrategy],
  exports: [AuthService],
})
export class AuthModule {}
```

#### JWT Strategy
```typescript
// jwt.strategy.ts
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private usersService: UsersService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException();
    }
    return { id: payload.sub, email: payload.email, role: payload.role };
  }
}
```

#### Auth Service
```typescript
// auth.service.ts
@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.usersService.findByEmail(email);
    if (user && await bcrypt.compare(password, user.password)) {
      return user;
    }
    return null;
  }

  async login(user: User) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    return {
      access_token: this.jwtService.sign(payload),
      user: { id: user.id, email: user.email, role: user.role },
    };
  }
}
```

### RBAC (Role-Based Access Control)

#### Role Decorator
```typescript
// roles.decorator.ts
export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

// Usage
@Roles(Role.ADMIN, Role.MANAGER)
@Get('admin-only')
getAdminData() { }
```

#### Roles Guard
```typescript
// roles.guard.ts
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    
    if (!requiredRoles) return true;
    
    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.includes(user.role);
  }
}
```

### Hierarchical Permissions

```typescript
// Permission hierarchy for this project
enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',  // Platform-wide
  GROUP_ADMIN = 'GROUP_ADMIN',  // Cross-company within group
  MANAGER = 'MANAGER',          // Department-level
  USER = 'USER',                // Personal data only
}

// Permission check with hierarchy
function hasPermission(userRole: Role, requiredRole: Role): boolean {
  const hierarchy = [Role.USER, Role.MANAGER, Role.GROUP_ADMIN, Role.SUPER_ADMIN];
  return hierarchy.indexOf(userRole) >= hierarchy.indexOf(requiredRole);
}

// Data scope by role
function getDataScope(user: AuthUser) {
  switch (user.role) {
    case Role.SUPER_ADMIN:
      return {}; // All data
    case Role.GROUP_ADMIN:
      return { groupId: user.groupId };
    case Role.MANAGER:
      return { departmentId: user.departmentId };
    case Role.USER:
      return { employeeId: user.employeeId };
  }
}
```

### Frontend Auth Context

```typescript
// AuthContext.tsx
interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

export const AuthProvider: React.FC<Props> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(
    localStorage.getItem('token')
  );

  const login = async (username: string, password: string) => {
    const response = await api.post('/auth/login', { username, password });
    const { access_token, user } = response.data;
    
    localStorage.setItem('token', access_token);
    setToken(access_token);
    setUser(user);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
};
```

### Security Best Practices

1. **Never store plain passwords** - Use bcrypt with salt
2. **Short-lived access tokens** - 15 minutes max
3. **Secure token storage** - HttpOnly cookies preferred
4. **Validate on every request** - Don't trust client
5. **Rate limit auth endpoints** - Prevent brute force
6. **Log auth events** - For audit trail
7. **Use HTTPS** - Always in production
8. **Rotate secrets** - Regularly change JWT secrets
