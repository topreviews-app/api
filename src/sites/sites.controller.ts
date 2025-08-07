import {
	Controller,
	Get,
	Post,
	Body,
	Put,
	Param,
	Delete,
	UseGuards,
	Request,
} from '@nestjs/common';
import { SitesService } from './sites.service';
import { CreateSiteDto } from './dto/create-site.dto';
import { UpdateSiteDto } from './dto/update-site.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('sites')
@UseGuards(JwtAuthGuard)
export class SitesController {
	constructor(private readonly sitesService: SitesService) { }

	@Post()
	create(@Request() req, @Body() createSiteDto: CreateSiteDto) {
		return this.sitesService.create(req.user.id, createSiteDto);
	}

	@Get()
	findAll(@Request() req) {
		return this.sitesService.findAllByUser(req.user.id);
	}

	@Get(':id')
	findOne(@Param('id') id: string, @Request() req) {
		return this.sitesService.findOne(id, req.user.id);
	}

	@Put(':id')
	update(
		@Param('id') id: string,
		@Request() req,
		@Body() updateSiteDto: UpdateSiteDto
	) {
		return this.sitesService.update(id, req.user.id, updateSiteDto);
	}

	@Put(':id/settings')
	updateSettings(
		@Param('id') id: string,
		@Request() req,
		@Body() updateSettingsDto: UpdateSettingsDto
	) {
		return this.sitesService.updateSettings(id, req.user.id, updateSettingsDto);
	}

	@Delete(':id')
	remove(@Param('id') id: string, @Request() req) {
		return this.sitesService.remove(id, req.user.id);
	}
}