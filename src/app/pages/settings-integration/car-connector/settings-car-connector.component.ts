import { Component, OnInit } from '@angular/core';
import { UntypedFormArray, UntypedFormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { StatusCodes } from 'http-status-codes';

import { CentralServerService } from '../../../services/central-server.service';
import { ComponentService } from '../../../services/component.service';
import { MessageService } from '../../../services/message.service';
import { SpinnerService } from '../../../services/spinner.service';
import { RestResponse } from '../../../types/GlobalType';
import { HTTPError } from '../../../types/HTTPError';
import { CarConnectorSettings } from '../../../types/Setting';
import { TenantComponents } from '../../../types/Tenant';
import { Utils } from '../../../utils/Utils';
import { SettingsCarConnectorConnectionEditableTableDataSource } from './settings-car-connector-connections-list-table-data-source';

@Component({
  selector: 'app-settings-car-connector',
  templateUrl: 'settings-car-connector.component.html',
  styleUrls: ['settings-car-connector.component.scss'],
  providers: [SettingsCarConnectorConnectionEditableTableDataSource]
})
export class SettingsCarConnectorComponent implements OnInit {
  public isActive = false;

  public formGroup!: UntypedFormGroup;
  public carConnectors!: UntypedFormArray;

  public carConnectorSettings!: CarConnectorSettings;

  public constructor(
    private centralServerService: CentralServerService,
    private componentService: ComponentService,
    private messageService: MessageService,
    private spinnerService: SpinnerService,
    private router: Router,
    public settingsCarConnectorConnectionTableDataSource: SettingsCarConnectorConnectionEditableTableDataSource) {
    this.isActive = this.componentService.isActive(TenantComponents.CAR_CONNECTOR);
  }

  public ngOnInit(): void {
    if (this.isActive) {
      // Build the form
      this.formGroup = new UntypedFormGroup({
        carConnectors: new UntypedFormArray([]),
      });
      // Form Controls
      this.carConnectors = this.formGroup.controls['carConnectors'] as UntypedFormArray;
      // Assign connections form to data source
      this.settingsCarConnectorConnectionTableDataSource.setFormArray(this.carConnectors);
      // Load the conf
      this.loadConfiguration();
    }
  }

  public loadConfiguration() {
    this.spinnerService.show();
    this.componentService.getCarConnectorSettings().subscribe((settings) => {
      this.spinnerService.hide();
      // Keep
      this.carConnectorSettings = settings;
      // Set
      this.settingsCarConnectorConnectionTableDataSource.setContent(this.carConnectorSettings.carConnector.connections);
      // Init form
      this.formGroup.markAsPristine();
    }, (error) => {
      this.spinnerService.hide();
      switch (error.status) {
        case StatusCodes.NOT_FOUND:
          this.messageService.showErrorMessage('settings.car_connector.setting_not_found');
          break;
        default:
          Utils.handleHttpError(error, this.router, this.messageService,
            this.centralServerService, 'general.unexpected_error_backend');
      }
    });
  }

  public save() {
    // Assign connections
    this.carConnectorSettings.carConnector.connections = this.settingsCarConnectorConnectionTableDataSource.getContent();
    // Save
    this.spinnerService.show();
    this.componentService.saveCarConnectorConnectionSettings(this.carConnectorSettings).subscribe((response) => {
      this.spinnerService.hide();
      if (response.status === RestResponse.SUCCESS) {
        this.messageService.showSuccessMessage(
          (!this.carConnectorSettings.id ? 'settings.car_connector.create_success' : 'settings.car_connector.update_success'));
        this.refresh();
      } else {
        Utils.handleError(JSON.stringify(response),
          this.messageService, (!this.carConnectorSettings.id ? 'settings.car_connector.create_error' : 'settings.car_connector.update_error'));
      }
    }, (error) => {
      this.spinnerService.hide();
      switch (error.status) {
        case StatusCodes.NOT_FOUND:
          this.messageService.showErrorMessage('settings.car_connector.setting_do_not_exist');
          break;
        default:
          Utils.handleHttpError(error, this.router, this.messageService, this.centralServerService,
            (!this.carConnectorSettings.id ? 'settings.car_connector.create_error' : 'settings.car_connector.update_error'));
      }
    });
  }

  public refresh() {
    // Reload settings
    this.loadConfiguration();
  }
}
