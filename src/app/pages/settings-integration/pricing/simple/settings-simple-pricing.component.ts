import { Component, Input, OnChanges, OnInit } from '@angular/core';
import { AbstractControl, UntypedFormControl, UntypedFormGroup, Validators } from '@angular/forms';

import { PricingSettings } from '../../../../types/Setting';

@Component({
  selector: 'app-settings-simple-pricing',
  templateUrl: 'settings-simple-pricing.component.html',
})
export class SettingsSimplePricingComponent implements OnInit, OnChanges {
  @Input() public formGroup!: UntypedFormGroup;
  @Input() public pricingSettings!: PricingSettings;
  @Input() public isCurrencyCodeReadonly!: boolean;

  public simplePricing!: UntypedFormGroup;
  public price!: AbstractControl;
  public currency!: AbstractControl;

  public ngOnInit(): void {
    // Simple pricing
    this.simplePricing = new UntypedFormGroup({
      price: new UntypedFormControl('',
        Validators.compose([
          Validators.required,
          Validators.pattern(/^-?((\d+(\.\d+)?))$/),
          Validators.maxLength(10),
        ]),
      ),
      currency: new UntypedFormControl('',
        Validators.compose([
          Validators.required,
          Validators.maxLength(3),
        ]),
      ),
    });
    // Add
    this.formGroup.addControl('simple', this.simplePricing);
    // Keep
    this.price = this.simplePricing.controls['price'];
    this.currency = this.simplePricing.controls['currency'];
    if ( this.isCurrencyCodeReadonly ) {
      this.currency.disable();
    }
    // Set
    this.updateFormData();
  }

  public ngOnChanges() {
    this.updateFormData();
  }

  public updateFormData() {
    // Set data
    if (this.simplePricing) {
      this.price.setValue(this.pricingSettings.simple.price);
      this.currency.setValue(this.pricingSettings.simple.currency);
    }
  }
}
