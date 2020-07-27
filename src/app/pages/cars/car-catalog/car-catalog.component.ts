import { Component, Input, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { AuthorizationService } from 'app/services/authorization.service';
import { CentralServerService } from 'app/services/central-server.service';
import { MessageService } from 'app/services/message.service';
import { SpinnerService } from 'app/services/spinner.service';
import { CarCatalog } from 'app/types/Car';
import { Utils } from 'app/utils/Utils';

@Component({
  selector: 'app-car-catalog',
  templateUrl: 'car-catalog.component.html'
})
export class CarCatalogComponent implements OnInit {
  @Input() public currentCarCatalogID!: number;
  @Input() public inDialog!: boolean;
  @Input() public dialogRef!: MatDialogRef<any>;
  public carCatalog: CarCatalog;
  public isSuperAdmin: boolean;

  constructor(
    private centralServerService: CentralServerService,
    public spinnerService: SpinnerService,
    private messageService: MessageService,
    private router: Router,
    private authorizationService: AuthorizationService) {
    this.isSuperAdmin = this.authorizationService.isSuperAdmin();
  }

  public ngOnInit(): void {
    this.loadCar();
  }

  public loadCar() {
    if (!this.currentCarCatalogID) {
      return;
    }
    this.spinnerService.show();
    this.centralServerService.getCarCatalog(this.currentCarCatalogID).subscribe((carCatalog: CarCatalog) => {
      this.spinnerService.hide();
      this.carCatalog = carCatalog;
    }, (error) => {
      // Show error
      this.spinnerService.hide();
      Utils.handleHttpError(error, this.router, this.messageService, this.centralServerService, 'cars.car_error');
    });
  }
}
