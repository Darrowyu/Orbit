import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SearchService } from './search.service';

@Controller('search')
@UseGuards(JwtAuthGuard)
export class SearchController {
  constructor(private service: SearchService) {}

  @Get()
  search(@Req() req, @Query('q') query: string, @Query('limit') limit?: string) {
    if (!query || query.length < 2) return { tasks: [], projects: [], comments: [] };
    return this.service.search(req.user.currentTeamId, query, limit ? parseInt(limit) : 10);
  }
}
