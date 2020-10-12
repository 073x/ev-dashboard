import { Component, Input, OnInit } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { AuthorizationService } from 'app/services/authorization.service';
import { CentralServerService } from 'app/services/central-server.service';
import { ConfigService } from 'app/services/config.service';
import { DialogService } from 'app/services/dialog.service';
import { MessageService } from 'app/services/message.service';
import { SpinnerService } from 'app/services/spinner.service';
import { Address } from 'app/types/Address';
import { Company, CompanyLogo } from 'app/types/Company';
import { RestResponse } from 'app/types/GlobalType';
import { HTTPError } from 'app/types/HTTPError';
import { ParentErrorStateMatcher } from 'app/utils/ParentStateMatcher';
import { Utils } from 'app/utils/Utils';
import { mergeMap } from 'rxjs/operators';

@Component({
  selector: 'app-company',
  templateUrl: 'company.component.html',
})
export class CompanyComponent implements OnInit {
  public parentErrorStateMatcher = new ParentErrorStateMatcher();
  @Input() public currentCompanyID!: string;
  @Input() public inDialog!: boolean;
  @Input() public dialogRef!: MatDialogRef<any>;

  public isAdmin = false;
  public logo: string = CompanyLogo.NO_LOGO;
  public maxSize: number;

  public formGroup!: FormGroup;
  public id!: AbstractControl;
  public name!: AbstractControl;
  public address!: Address;

  constructor(
    private authorizationService: AuthorizationService,
    private centralServerService: CentralServerService,
    private messageService: MessageService,
    private spinnerService: SpinnerService,
    private configService: ConfigService,
    private activatedRoute: ActivatedRoute,
    private dialog: MatDialog,
    private dialogService: DialogService,
    private translateService: TranslateService,
    private router: Router) {
    this.maxSize = this.configService.getCompany().maxLogoKb;
    // Check auth
    if (this.activatedRoute.snapshot.params['id'] &&
      !authorizationService.canUpdateCompany()) {
      // Not authorized
      this.router.navigate(['/']);
    }
    // get admin flag
    this.isAdmin = this.authorizationService.isAdmin() || this.authorizationService.isSuperAdmin();
  }

  public ngOnInit() {
    // Init the form
    this.formGroup = new FormGroup({
      id: new FormControl(''),
      name: new FormControl('',
        Validators.compose([
          Validators.required,
        ])),
    });
    // Form
    this.id = this.formGroup.controls['id'];
    this.name = this.formGroup.controls['name'];
    // if not admin switch in readonly mode
    if (!this.isAdmin) {
      this.formGroup.disable();
    }
    if (this.currentCompanyID) {
      this.loadCompany();
    } else if (this.activatedRoute && this.activatedRoute.params) {
      this.activatedRoute.params.subscribe((params: Params) => {
        this.currentCompanyID = params['id'];
        this.loadCompany();
      });
    }
  }

  public setCurrentCompanyId(currentCompanyId: string) {
    this.currentCompanyID = currentCompanyId;
  }

  public refresh() {
    this.loadCompany();
  }

  public loadCompany() {
    if (!this.currentCompanyID) {
      return;
    }
    this.spinnerService.show();
    this.centralServerService.getCompany(this.currentCompanyID).pipe(mergeMap((company) => {
      if (company.id) {
        this.formGroup.controls.id.setValue(company.id);
      }
      if (company.name) {
        this.formGroup.controls.name.setValue(company.name);
      }
      if (company.address) {
        this.address = company.address;
      }
      this.formGroup.updateValueAndValidity();
      this.formGroup.markAsPristine();
      this.formGroup.markAllAsTouched();
      // Yes, get logo
      return this.centralServerService.getCompanyLogo(this.currentCompanyID);
    })).subscribe((companyLogo) => {
      if (companyLogo && companyLogo.logo) {
        this.logo = companyLogo.logo.toString();
      }
      this.spinnerService.hide();
    }, (error) => {
      this.spinnerService.hide();
      switch (error.status) {
        case HTTPError.OBJECT_DOES_NOT_EXIST_ERROR:
          this.messageService.showErrorMessage('companies.company_not_found');
          break;
        default:
          Utils.handleHttpError(error, this.router, this.messageService,
            this.centralServerService, 'general.unexpected_error_backend');
      }
    });
  }

  public updateCompanyLogo(company: Company) {
    // Check no company?
    if (!this.logo.endsWith(CompanyLogo.NO_LOGO)) {
      // Set to company
      company.logo = this.logo;
    } else {
      // No logo
      delete company.logo;
    }
  }

  public updateCompanyCoordinates(company: Company) {
    if (company.address && company.address.coordinates &&
      !(company.address.coordinates[0] || company.address.coordinates[1])) {
      delete company.address.coordinates;
    }
  }

  public saveCompany(company: Company) {
    if (this.currentCompanyID) {
      this.updateCompany(company);
    } else {
      this.createCompany(company);
    }
  }

  public logoChanged(event: any) {
    // load picture
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (file.size > (this.maxSize * 1024)) {
        this.messageService.showErrorMessage('companies.logo_size_error', { maxPictureKb: this.maxSize });
      } else {
        const reader = new FileReader();
        reader.onload = () => {
          this.logo = reader.result as string;
          this.formGroup.markAsDirty();
        };
        reader.readAsDataURL(file);
      }
    }
  }

  public clearLogo() {
    // Clear
    this.logo = CompanyLogo.NO_LOGO;
    // Set form dirty
    this.formGroup.markAsDirty();
  }

  public closeDialog(saved: boolean = false) {
    if (this.inDialog) {
      this.dialogRef.close(saved);
    }
  }

  public close() {
    Utils.checkAndSaveAndCloseDialog(this.formGroup, this.dialogService,
      this.translateService, this.saveCompany.bind(this), this.closeDialog.bind(this));
  }

  private createCompany(company: Company) {
    this.spinnerService.show();
    // Set the logo
    this.updateCompanyLogo(company);
    // Set coordinates
    this.updateCompanyCoordinates(company);
    // Create
    this.centralServerService.createCompany(company).subscribe((response) => {
      this.spinnerService.hide();
      if (response.status === RestResponse.SUCCESS) {
        this.messageService.showSuccessMessage('companies.create_success',
          { companyName: company.name });
        this.currentCompanyID = company.id;
        this.closeDialog(true);
      } else {
        Utils.handleError(JSON.stringify(response),
          this.messageService, 'companies.create_error');
      }
    }, (error) => {
      this.spinnerService.hide();
      switch (error.status) {
        case HTTPError.OBJECT_DOES_NOT_EXIST_ERROR:
          this.messageService.showErrorMessage('companies.company_not_found');
          break;
        default:
          Utils.handleHttpError(error, this.router, this.messageService,
            this.centralServerService, 'companies.create_error');
      }
    });
  }

  private updateCompany(company: Company) {
    this.spinnerService.show();
    // Set the logo
    this.updateCompanyLogo(company);
    // Set coordinates
    this.updateCompanyCoordinates(company);
    // Update
    this.centralServerService.updateCompany(company).subscribe((response) => {
      this.spinnerService.hide();
      if (response.status === RestResponse.SUCCESS) {
        this.messageService.showSuccessMessage('companies.update_success', { companyName: company.name });
        this.closeDialog(true);
      } else {
        Utils.handleError(JSON.stringify(response),
          this.messageService, 'companies.update_error');
      }
    }, (error) => {
      this.spinnerService.hide();
      switch (error.status) {
        case HTTPError.OBJECT_DOES_NOT_EXIST_ERROR:
          this.messageService.showErrorMessage('companies.company_not_found');
          break;
        default:
          Utils.handleHttpError(error, this.router, this.messageService,
            this.centralServerService, 'companies.update_error');
      }
    });
  }
}
