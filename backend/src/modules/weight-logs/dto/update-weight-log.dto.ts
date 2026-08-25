import { PartialType } from '@nestjs/swagger';
import { CreateWeightLogDto } from './create-weight-log.dto';

export class UpdateWeightLogDto extends PartialType(CreateWeightLogDto) {}
