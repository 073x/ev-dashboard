import { Injectable } from '@angular/core';
import { Validators } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import { ButtonType, DropdownItem, TableActionDef, TableColumnDef, TableDef, TableEditType } from 'app/types/Table';
import { Tag } from 'app/types/Tag';

import { DialogService } from '../../../services/dialog.service';
import { SpinnerService } from '../../../services/spinner.service';
import { TableActivateAction } from '../../../shared/table/actions/table-activate-action';
import { TableDeactivateAction } from '../../../shared/table/actions/table-deactivate-action';
import { EditableTableDataSource } from '../../../shared/table/editable-table-data-source';
import { ButtonAction } from '../../../types/GlobalType';
import { TagStatusFormatterComponent } from '../formatters/tag-status-formatter.component';

@Injectable()
export class UserTagsEditableTableDataSource extends EditableTableDataSource<Tag> {
  private activateAction = new TableActivateAction().getActionDef();
  private deactivateAction = new TableDeactivateAction().getActionDef();

  constructor(
    public spinnerService: SpinnerService,
    public translateService: TranslateService,
    private dialogService: DialogService) {
    super(spinnerService, translateService);
  }

  public buildTableDef(): TableDef {
    return {
      id: 'UserTagsTableDataSource',
      isEditable: true,
      rowFieldNameIdentifier: 'id',
      errorMessage: 'users.missing_tag',
      hasDynamicRowAction: true,
    };
  }

  public setContent(content: Tag[]) {
    if (content.length === 0) {
      const tag = this.createRow();
      content.push(tag);
    }
    super.setContent(content);
  }

  public buildTableDynamicRowActions(tag: Tag): TableActionDef[] {
    const actions = [];
    if (tag.active) {
      actions.push(this.deactivateAction);
    } else {
      actions.push(this.activateAction);
    }
    if (!tag.transactionsCount) {
      actions.push(this.deleteAction);
    }
    return actions;
  }

  public rowActionTriggered(actionDef: TableActionDef, tag: Tag, dropdownItem?: DropdownItem, postDataProcessing?: () => void) {
    const index = this.editableRows.indexOf(tag);
    let actionDone = false;
    switch (actionDef.id) {
      case ButtonAction.DELETE:
        this.editableRows.splice(index, 1);
        actionDone = true;
        break;
      case ButtonAction.ACTIVATE:
        this.activateTag(tag);
        break;
      case ButtonAction.DEACTIVATE:
        this.deactivateTag(tag);
        break;
    }
    // Call post process
    if (actionDone) {
      this.refreshData(false).subscribe();
      if (this.formArray) {
        this.formArray.markAsDirty();
      }
      // Call post data processing
      if (postDataProcessing) {
        postDataProcessing();
      }
      // Notify
      this.tableChangedSubject.next(this.editableRows);
    }
  }

  public buildTableColumnDefs(): TableColumnDef[] {
    return [
      {
        id: 'active',
        name: 'tags.status',
        editType: TableEditType.DISPLAY_ONLY,
        isAngularComponent: true,
        angularComponent: TagStatusFormatterComponent,
        headerClass: 'col-15p',
        class: 'text-center col-15p',
      },
      {
        id: 'id',
        name: 'tags.id',
        editType: TableEditType.INPUT,
        validators: [
          Validators.required,
          Validators.minLength(8),
          Validators.maxLength(20),
          Validators.pattern('^[a-zA-Z0-9]*$'),
        ],
        canBeDisabled: true,
        unique: true,
        errors: [
          { id: 'required', message: 'general.mandatory_field' },
          { id: 'minlength', message: 'general.error_min_length', messageParams: { length: 8 } },
          { id: 'maxlength', message: 'general.error_max_length', messageParams: { length: 20 } },
          { id: 'pattern', message: 'users.invalid_tag_id' },
        ],
        headerClass: 'text-left col-20p',
        class: 'text-left col-20p',
      },
      {
        id: 'description',
        name: 'general.description',
        editType: TableEditType.INPUT,
        headerClass: 'text-left col-40p',
        class: 'text-left col-40p',
      },
      {
        id: 'issuer',
        name: 'tags.issuer',
        editType: TableEditType.RADIO_BUTTON,
        headerClass: 'col-15p',
        class: 'text-center col-15p',
      },
      {
        id: 'transactionsCount',
        name: 'tags.sessions',
        editType: TableEditType.DISPLAY_ONLY,
        formatter: (transactionsCount: number) => transactionsCount ? transactionsCount.toString() : '-',
        headerClass: 'col-10p',
        class: 'text-center col-10p',
      },
    ];
  }

  public createRow() {
    return {
      id: this.generateTagID(),
      key: '',
      description: '',
      issuer: this.getContent().length === 0 ? true : false,
      active: true,
    };
  }

  protected isCellDisabled(columnDef: TableColumnDef, tag: Tag): boolean {
    return tag && tag.transactionsCount ? tag.transactionsCount > 0 : false;
  }

  private activateTag(tag: Tag) {
    this.dialogService.createAndShowYesNoDialog(
      this.translateService.instant('tags.activate_title'),
      this.translateService.instant('tags.activate_confirm', {tagID: tag.id}),
    ).subscribe((result) => {
      if (result === ButtonType.YES) {
        this.setPropertyValue(tag, 'active', true);
        this.refreshData(false).subscribe();
        if (this.formArray) {
          this.formArray.markAsDirty();
        }
        // Notify
        this.tableChangedSubject.next(this.editableRows);
      }
    });
  }

  private deactivateTag(tag: Tag) {
    this.dialogService.createAndShowYesNoDialog(
      this.translateService.instant('tags.deactivate_title'),
      this.translateService.instant('tags.deactivate_confirm', {tagID: tag.id}),
    ).subscribe((result) => {
      if (result === ButtonType.YES) {
        this.setPropertyValue(tag, 'active', false);
        this.refreshData(false).subscribe();
        if (this.formArray) {
          this.formArray.markAsDirty();
        }
        // Notify
        this.tableChangedSubject.next(this.editableRows);
      }
    });
  }

  private generateTagID() {
    return 'VB' + Math.floor((Math.random() * 2147483648) + 1);
  }
}
