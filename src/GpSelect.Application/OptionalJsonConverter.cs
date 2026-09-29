using System.Text.Json;
using System.Text.Json.Serialization;
using GpSelect.Domain;

namespace GpSelect.Application;

/// <summary>Reads <see cref="Optional{T}"/>: the converter only runs for properties present in the JSON,
/// so a missing property stays unset while an explicit null becomes a present null.</summary>
public sealed class OptionalJsonConverterFactory : JsonConverterFactory
{
    public override bool CanConvert(Type typeToConvert) =>
        typeToConvert.IsGenericType && typeToConvert.GetGenericTypeDefinition() == typeof(Optional<>);

    public override JsonConverter CreateConverter(Type typeToConvert, JsonSerializerOptions options) =>
        (JsonConverter)Activator.CreateInstance(typeof(OptionalConverter<>).MakeGenericType(typeToConvert.GetGenericArguments()[0]))!;

    private sealed class OptionalConverter<T> : JsonConverter<Optional<T>>
    {
        public override bool HandleNull => true;

        public override Optional<T> Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options) =>
            Optional<T>.Of(reader.TokenType == JsonTokenType.Null ? default! : JsonSerializer.Deserialize<T>(ref reader, options)!);

        public override void Write(Utf8JsonWriter writer, Optional<T> value, JsonSerializerOptions options)
        {
            if (value.HasValue) JsonSerializer.Serialize(writer, value.Value, options);
            else writer.WriteNullValue();
        }
    }
}
