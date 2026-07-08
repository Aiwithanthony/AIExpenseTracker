import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { buildTypeOrmOptions } from './typeorm-options';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) =>
        // ConfigService is backed by process.env; the shared builder reads the
        // same values the migration CLI uses so app + CLI never drift.
        buildTypeOrmOptions(process.env),
      inject: [ConfigService],
    }),
  ],
})
export class DatabaseModule {}
