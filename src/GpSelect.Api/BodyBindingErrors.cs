using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;

namespace GpSelect.Api;

/// <summary>When a JSON body cannot be read, model binding reports the real error (under "$.field") and also
/// "The r field is required." for the action's body parameter, which only names a C# variable. That second error
/// is dropped; the implicit [Required] of non-nullable members stays on (SuppressImplicitRequiredAttribute… untouched).</summary>
public static class BodyBindingErrors
{
    public static void RemoveSpurious(ActionContext context)
    {
        var state = context.ModelState;
        if (!state.Keys.Any(key => key.StartsWith('$'))) return;
        foreach (var parameter in context.ActionDescriptor.Parameters)
            if (parameter.BindingInfo?.BindingSource == BindingSource.Body) state.Remove(parameter.Name);
    }
}
