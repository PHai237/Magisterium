import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { AuthUserScopeMiddleware } from './auth/auth-user-scope.middleware';
import { AuthModule } from './auth/auth.module';
import { CharacterModule } from './character/character.module';
import { DatabaseModule } from './database/database.module';
import { BattleModule } from './game/battle/battle.module';
import { ExplorationModule } from './game/exploration/exploration.module';
import { MarketModule } from './game/market/market.module';
import { LibraryModule } from './game/library/library.module';
import { SanctuaryModule } from './game/sanctuary/sanctuary.module';
import { SmithModule } from './game/smith/smith.module';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    CharacterModule,
    BattleModule,
    ExplorationModule,
    MarketModule,
    LibraryModule,
    SanctuaryModule,
    SmithModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(AuthUserScopeMiddleware).forRoutes(
      {
        path: 'characters',
        method: RequestMethod.ALL,
      },
      {
        path: 'characters/(.*)',
        method: RequestMethod.ALL,
      },
      {
        path: 'battles',
        method: RequestMethod.ALL,
      },
      {
        path: 'battles/(.*)',
        method: RequestMethod.ALL,
      },
      {
        path: 'exploration',
        method: RequestMethod.ALL,
      },
      {
        path: 'exploration/(.*)',
        method: RequestMethod.ALL,
      },
      {
        path: 'market',
        method: RequestMethod.ALL,
      },
      {
        path: 'market/(.*)',
        method: RequestMethod.ALL,
      },
      {
        path: 'library',
        method: RequestMethod.ALL,
      },
      {
        path: 'library/(.*)',
        method: RequestMethod.ALL,
      },
      {
        path: 'sanctuary',
        method: RequestMethod.ALL,
      },
      {
        path: 'sanctuary/(.*)',
        method: RequestMethod.ALL,
      },
      {
        path: 'smith',
        method: RequestMethod.ALL,
      },
      {
        path: 'smith/(.*)',
        method: RequestMethod.ALL,
      },
    );
  }
}
