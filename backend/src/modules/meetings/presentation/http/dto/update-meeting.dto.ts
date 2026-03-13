import {
  ArrayMaxSize,
  IsBoolean,
  IsEnum,
  IsISO8601,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";
import { MEETING_ACCESS_POLICIES } from "../../../domain/access-policy";

export class UpdateMeetingDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1_000)
  description?: string | null;

  @IsOptional()
  @IsEnum(MEETING_ACCESS_POLICIES)
  accessPolicy?: (typeof MEETING_ACCESS_POLICIES)[number];

  @IsOptional()
  @IsBoolean()
  allowJoinBeforeHost?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(64)
  @IsString({ each: true })
  @MaxLength(255, { each: true })
  allowedUserIds?: string[];

  @IsOptional()
  @IsISO8601()
  startsAt?: string | null;
}
