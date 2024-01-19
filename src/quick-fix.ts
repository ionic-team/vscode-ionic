import {
  CancellationToken,
  CodeAction,
  CodeActionContext,
  CodeActionKind,
  CodeActionProvider,
  Command,
  Diagnostic,
  Position,
  ProviderResult,
  Range,
  TextDocument,
  WorkspaceEdit,
} from 'vscode';
import { autoFixAngularImports } from './angular-imports';

export class ImportQuickFixProvider implements CodeActionProvider {
  public static readonly providedCodeActionKinds = [CodeActionKind.QuickFix];

  public provideCodeActions(
    document: TextDocument,
    range: Range | Selection,
    context: CodeActionContext,
    token: CancellationToken,
  ): ProviderResult<(CodeAction | Command)[]> {
    // Filter out diagnostics that are not related to missing imports
    const missingImportDiagnostics = context.diagnostics.filter((diagnostic) =>
      diagnostic.message.includes('is not a known element'),
    );

    // Return an array of code actions for each diagnostic
    return missingImportDiagnostics.map((diagnostic) => this.createImportQuickFix(document, diagnostic));
  }

  private createImportQuickFix(document: TextDocument, diagnostic: Diagnostic): CodeAction {
    // Get the name of the missing identifier from the diagnostic message
    const missingComponent = diagnostic.message.split(' ')[0].replace(/["']/g, '');

    autoFixAngularImports(document, missingComponent);
    return;
  }
}
