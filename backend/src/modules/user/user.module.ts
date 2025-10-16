import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { User } from './user.entity';
import { RelayerModule } from '../relayer/relayer.module';
@Module({
  imports: [
    // Configure TypeORM to use the User entity for database operations
    TypeOrmModule.forFeature([User]),
    // Import RelayerModule for relayer integration (using forwardRef to avoid circular dependency)
    forwardRef(() => RelayerModule),
  ],
  controllers: [
    UserController, // Register the UserController to handle HTTP requests
  ],
  providers: [
    UserService, // Provide the UserService for dependency injection
  ],
  exports: [
    // Export the TypeORM configuration for the User entity so other modules can access the User repository
    TypeOrmModule.forFeature([User]),
    // Export UserService so other modules can use it
    UserService,
  ],
})
export class UserModule {}