import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, MaxLength } from "class-validator";

export class ReassignWorkflowStepDto {
  @ApiProperty({ description: "User ID of the replacement approver." })
  @IsString()
  @IsNotEmpty()
  user_id: string;

  @ApiProperty({ description: "Required audit reason for changing the approver." })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  reason: string;
}
