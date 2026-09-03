import { Module } from "@nestjs/common";
import { WorkflowDefinitionsController } from "./workflow-definitions.controller";
import { WorkflowDefinitionsService } from "./workflow-definitions.service";

@Module({ controllers: [WorkflowDefinitionsController], providers: [WorkflowDefinitionsService], exports: [WorkflowDefinitionsService] })
export class WorkflowDefinitionsModule {}
